import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { collectContext } from '../context.js';
import { resolvePath, withPathHeader } from '../util.js';
import {
  registerDoc,
  removeDoc,
  loadDocs,
  findBindingsForFile,
  loadRenovations,
  addRenovation,
  updateRenovation,
  formatDocsOverview,
  formatRenovationHistory,
  generateClaudeMdSnippet,
  generateFullClaudeMdSection,
  saveComplianceScore,
  formatComplianceTrend,
} from '../docs.js';
import { buildDocCheckPrompt, buildDocGatePrompt } from '../prompts/doc-check.js';
import { buildRenovationPrompt } from '../prompts/renovation.js';

function readDocFiles(cwd: string, docPaths: string[]): Record<string, string> {
  const contents: Record<string, string> = {};
  for (const docPath of docPaths) {
    try {
      contents[docPath] = readFileSync(join(cwd, docPath), 'utf-8');
    } catch {
      contents[docPath] = `(File not found: ${docPath})`;
    }
  }
  return contents;
}

const MAX_CODE_FILE_SIZE = 5000; // chars per file

function readCodeFiles(cwd: string, filePaths: string[]): Record<string, string> {
  const contents: Record<string, string> = {};
  for (const filePath of filePaths) {
    try {
      const raw = readFileSync(join(cwd, filePath), 'utf-8');
      contents[filePath] = raw.length > MAX_CODE_FILE_SIZE
        ? raw.slice(0, MAX_CODE_FILE_SIZE) + '\n...(truncated)'
        : raw;
    } catch {
      contents[filePath] = `(File not found: ${filePath})`;
    }
  }
  return contents;
}

export function registerDocsTools(server: McpServer): void {

  // --- Tool 1: doc (manage + check unified) ---

  server.tool(
    'doc',
    'Domain knowledge management and verification. Actions: "register" to bind docs to code paths, "remove" to delete a binding, "list" to show all bindings, "check" to verify changed code against documentation.',
    {
      action: z
        .enum(['register', 'remove', 'list', 'check'])
        .describe('Action: register a binding, remove one, list all, or check code compliance against docs'),
      domain: z
        .string()
        .optional()
        .describe('Domain name. Required for register/remove, optional for check (auto-detects). E.g. "volcano-rtc"'),
      docs: z
        .array(z.string())
        .optional()
        .describe('(register) Paths to documentation files relative to project root'),
      scope: z
        .array(z.string())
        .optional()
        .describe('(register) Glob patterns for protected code paths, e.g. ["src/rtc/**"]'),
      rule: z
        .string()
        .optional()
        .describe('(register) Human-readable rule, e.g. "Must read Volcano AI docs before modifying RTC code."'),
      changed_files: z
        .array(z.string())
        .optional()
        .describe('(check) List of changed file paths (relative to project root) to verify against docs'),
      compliance_correct: z
        .number()
        .optional()
        .describe('(check) After AI completes the check, call doc again with action "check" passing the compliance score: number of correct fields'),
      compliance_total: z
        .number()
        .optional()
        .describe('(check) Total number of fields checked. Paired with compliance_correct to save the score.'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ action, domain, docs, scope, rule, changed_files, compliance_correct, compliance_total, project_path }) => {
      const cwd = resolvePath(project_path);

      // --- list ---
      if (action === 'list') {
        const docsOverview = formatDocsOverview(cwd);
        const renovationHistory = formatRenovationHistory(cwd);
        const config = loadDocs(cwd);

        // Check CLAUDE.md for domain knowledge rules
        let claudeMdStatus = 'Not configured';
        try {
          const claudeMd = readFileSync(join(cwd, 'CLAUDE.md'), 'utf-8');
          const hasDomainRules = claudeMd.includes('Domain Knowledge Rules');
          claudeMdStatus = hasDomainRules ? 'Configured' : 'Not configured';
        } catch {
          claudeMdStatus = 'No CLAUDE.md file';
        }

        const trend = formatComplianceTrend(cwd);

        let protectionStatus = '';
        if (config.bindings.length > 0) {
          protectionStatus = `\n## Protection Status\n\n` +
            `- **MCP doc_gate**: Active (auto-trigger)\n` +
            `- **CLAUDE.md rules**: ${claudeMdStatus}` +
            (claudeMdStatus !== 'Configured' ? ' (run `doc` action "register" to get the snippet)' : '') +
            '\n' +
            (trend ? `\n${trend}` : '');
        }

        return {
          content: [{
            type: 'text' as const,
            text: withPathHeader(docsOverview + protectionStatus + '\n---\n\n' + renovationHistory, cwd),
          }],
        };
      }

      // --- remove ---
      if (action === 'remove') {
        if (!domain) {
          return {
            content: [{ type: 'text' as const, text: 'Error: "domain" is required for remove action.' }],
            isError: true,
          };
        }
        const removed = removeDoc(cwd, domain);
        if (!removed) {
          const config = loadDocs(cwd);
          return {
            content: [{
              type: 'text' as const,
              text: `Domain "${domain}" not found. Registered domains: ${config.bindings.map(b => b.domain).join(', ') || '(none)'}`,
            }],
          };
        }
        return {
          content: [{
            type: 'text' as const,
            text: withPathHeader(`Domain "${domain}" removed.\n\n${formatDocsOverview(cwd)}`, cwd),
          }],
        };
      }

      // --- register ---
      if (action === 'register') {
        if (!domain) {
          return {
            content: [{ type: 'text' as const, text: 'Error: "domain" is required for register action.' }],
            isError: true,
          };
        }
        if (!docs || docs.length === 0 || !scope || scope.length === 0 || !rule) {
          return {
            content: [{ type: 'text' as const, text: 'Error: "docs", "scope", and "rule" are required for register action.' }],
            isError: true,
          };
        }

        try {
          const binding = registerDoc(cwd, domain, docs, scope, rule);
          const overview = formatDocsOverview(cwd);
          const snippet = generateClaudeMdSnippet(binding);

          return {
            content: [{
              type: 'text' as const,
              text: withPathHeader(
                `# Doc Binding Registered\n\n` +
                `**Domain**: ${binding.domain}\n` +
                `**Rule**: ${binding.rule}\n` +
                `**Docs**: ${binding.docs.join(', ')}\n` +
                `**Scope**: ${binding.scope.join(', ')}\n\n` +
                `Protection: MCP auto-trigger active (doc_gate)\n\n` +
                `---\n\n` +
                `## Keep Docs Fresh\n\n` +
                `To update bound documentation in the future:\n` +
                `- **Context7 MCP** (if installed): \`resolve-library-id\` → \`get-library-docs\` for 9000+ public libraries\n` +
                `- **Firecrawl MCP** (if installed): \`firecrawl_scrape(url: "<official-docs-url>")\` for any web docs\n` +
                `- Then overwrite the doc file and re-run \`doc\` with action "check" to verify compliance\n\n` +
                `---\n\n` +
                `## Add to CLAUDE.md (recommended)\n\n` +
                `Copy the following into your project's CLAUDE.md to ensure protection works in all AI editors (not just MCP-enabled ones):\n\n` +
                '```markdown\n' +
                `## Domain Knowledge Rules\n\n` +
                snippet + '\n' +
                '```\n\n' +
                `---\n\n${overview}`,
                cwd,
              ),
            }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text' as const, text: `Error registering doc binding: ${message}` }],
            isError: true,
          };
        }
      }

      // --- check: score save mode (AI calls back with results) ---
      if (action === 'check' && compliance_correct !== undefined && compliance_total !== undefined) {
        const checkDomain = domain || 'unknown';
        const score = saveComplianceScore(cwd, checkDomain, compliance_correct, compliance_total);
        const trend = formatComplianceTrend(cwd, checkDomain);

        return {
          content: [{
            type: 'text' as const,
            text: withPathHeader(
              `# Compliance Score Saved\n\n` +
              `**Domain**: ${score.domain}\n` +
              `**Score**: ${score.correct}/${score.total} (${score.score}%)\n` +
              `**Status**: ${score.score >= 80 ? 'PASS' : 'NEEDS ATTENTION'}\n\n` +
              (trend ? `---\n\n${trend}` : ''),
              cwd,
            ),
          }],
        };
      }

      // --- check: verification mode ---
      if (!changed_files || changed_files.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'Error: "changed_files" is required for check action.' }],
          isError: true,
        };
      }

      try {
        const context = await collectContext(cwd);
        const config = loadDocs(cwd);

        let bindings;
        if (domain) {
          bindings = config.bindings.filter(b => b.domain === domain);
          if (bindings.length === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: `No doc binding found for domain "${domain}". Registered domains: ${config.bindings.map(b => b.domain).join(', ') || '(none)'}`,
              }],
            };
          }
        } else {
          const bindingSet = new Set<string>();
          bindings = [];
          for (const file of changed_files) {
            for (const b of findBindingsForFile(cwd, file)) {
              if (!bindingSet.has(b.domain)) {
                bindingSet.add(b.domain);
                bindings.push(b);
              }
            }
          }

          if (bindings.length === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: `No doc bindings match the changed files. Changed: ${changed_files.join(', ')}.\n\nRegistered scopes: ${config.bindings.map(b => `${b.domain}: ${b.scope.join(', ')}`).join('; ') || '(none)'}`,
              }],
            };
          }
        }

        const allDocPaths = [...new Set(bindings.flatMap(b => b.docs))];
        const docContents = readDocFiles(cwd, allDocPaths);
        const codeContents = readCodeFiles(cwd, changed_files);

        const prompt = buildDocCheckPrompt(context, bindings, changed_files, docContents, codeContents);

        return {
          content: [{ type: 'text' as const, text: withPathHeader(prompt, cwd) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error running doc check: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // --- Tool 2: doc_gate (独立，高频 auto-trigger，安全关键路径) ---

  server.tool(
    'doc_gate',
    'Check if a file is protected by a domain knowledge rule. Returns a mandatory gate prompt if protected, or a pass-through if not. Called automatically before file modifications.',
    {
      file_path: z
        .string()
        .describe('File path (relative to project root) about to be modified'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ file_path, project_path }) => {
      const cwd = resolvePath(project_path);

      const bindings = findBindingsForFile(cwd, file_path);
      if (bindings.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No domain knowledge gate for \`${file_path}\`. Proceed freely.`,
          }],
        };
      }

      const binding = bindings[0];
      const prompt = buildDocGatePrompt(binding, file_path);

      return {
        content: [{ type: 'text' as const, text: withPathHeader(prompt, cwd) }],
      };
    },
  );

  // --- Tool 3: renovation (start + save) ---

  server.tool(
    'renovation',
    'Domain knowledge renovation. Actions: "start" to begin a systematic audit of code vs documentation, "save" to record discoveries and fixes after a batch completes. Use when you suspect accumulated wrong assumptions from AI guessing.',
    {
      action: z
        .enum(['start', 'save'])
        .describe('Action: "start" a new renovation batch, or "save" results of a completed batch'),
      domain: z
        .string()
        .optional()
        .describe('(start) Domain to renovate, must match a registered doc binding'),
      batch: z
        .number()
        .optional()
        .describe('(start) Batch number for multi-pass renovation. Defaults to next batch.'),
      renovation_id: z
        .number()
        .optional()
        .describe('(save) ID of the renovation record to update'),
      discoveries: z
        .array(z.string())
        .optional()
        .describe('(save) List of discoveries, e.g. ["Found batch API in docs that replaces N+1 calls"]'),
      fixes: z
        .array(z.string())
        .optional()
        .describe('(save) List of fixes applied, e.g. ["Changed onUserJoin to onUserJoined in rtc.ts"]'),
      status: z
        .enum(['in_progress', 'completed'])
        .optional()
        .describe('(save) Update status. Set to "completed" when batch is done.'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ action, domain, batch, renovation_id, discoveries, fixes, status, project_path }) => {
      const cwd = resolvePath(project_path);

      if (action === 'save') {
        if (renovation_id === undefined) {
          return {
            content: [{ type: 'text' as const, text: 'Error: "renovation_id" is required for save action.' }],
            isError: true,
          };
        }

        const updates: Partial<Pick<import('../docs.js').RenovationRecord, 'discoveries' | 'fixes' | 'status'>> = {};
        if (discoveries !== undefined) updates.discoveries = discoveries;
        if (fixes !== undefined) updates.fixes = fixes;
        if (status !== undefined) updates.status = status;

        const record = updateRenovation(cwd, renovation_id, updates);
        if (!record) {
          return {
            content: [{
              type: 'text' as const,
              text: `Renovation #${renovation_id} not found. Use \`renovation\` with action "start" to begin a new one.`,
            }],
          };
        }

        const history = formatRenovationHistory(cwd, record.domain);
        const trend = formatComplianceTrend(cwd, record.domain);

        let followUp = '';
        if (record.status === 'completed') {
          followUp = `\n\n---\n\n## Renovation Complete — Compliance Confirmation Required\n\n` +
            `Renovation for **${record.domain}** is done. To confirm the code is now compliant:\n\n` +
            `1. Run \`doc\` with action "check" on all modified files in scope\n` +
            `2. The check will verify every field against documentation\n` +
            `3. The compliance score will be saved for trend tracking\n\n` +
            `This step is required to close the renovation loop.`;
        }

        return {
          content: [{
            type: 'text' as const,
            text: withPathHeader(
              `# Renovation #${record.id} Updated\n\n` +
              `**Status**: ${record.status}\n` +
              `**Discoveries**: ${record.discoveries.length}\n` +
              `**Fixes**: ${record.fixes.length}\n\n` +
              (trend ? `---\n\n${trend}` : '') +
              `---\n\n${history}` +
              followUp,
              cwd,
            ),
          }],
        };
      }

      // action === 'start'
      if (!domain) {
        return {
          content: [{ type: 'text' as const, text: 'Error: "domain" is required to start a renovation.' }],
          isError: true,
        };
      }

      try {
        const config = loadDocs(cwd);
        const binding = config.bindings.find(b => b.domain === domain);

        if (!binding) {
          return {
            content: [{
              type: 'text' as const,
              text: `No doc binding found for domain "${domain}". Register one first with \`doc\` action "register".\n\nRegistered domains: ${config.bindings.map(b => b.domain).join(', ') || '(none)'}`,
            }],
          };
        }

        const context = await collectContext(cwd);
        const renovations = loadRenovations(cwd);
        const domainRecords = renovations.records.filter(r => r.domain === domain);

        const batchNumber = batch ?? (domainRecords.length > 0
          ? Math.max(...domainRecords.map(r => r.batch)) + 1
          : 1);

        const record = addRenovation(cwd, domain, batchNumber);
        const docContents = readDocFiles(cwd, binding.docs);
        const prompt = buildRenovationPrompt(context, binding, docContents, domainRecords, batchNumber);

        return {
          content: [
            { type: 'text' as const, text: withPathHeader(prompt, cwd) },
            {
              type: 'text' as const,
              text: `\n\n---\n\nRenovation #${record.id} started (Batch ${batchNumber}). After completing this renovation, call \`renovation\` with action "save" and renovation_id=${record.id} to record your discoveries and fixes.`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error starting renovation: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
