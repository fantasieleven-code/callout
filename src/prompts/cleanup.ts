import type { ProjectContext } from '../types.js';

export function buildCleanupPrompt(ctx: ProjectContext): string {
  return `You are a senior engineer doing a cleanup audit of an AI-assisted codebase. AI-generated code often has redundancy, dead code, and over-engineering. Find what can be safely removed or merged.

## Project
- **Name**: ${ctx.name}
- **Tech Stack**: ${ctx.techStack.join(', ')}
- **Scale**: ${ctx.stats.totalFiles} files, ~${ctx.stats.codeLines} lines, ${ctx.stats.testFiles} test files

## File Structure
\`\`\`
${ctx.fileTree}
\`\`\`

${ctx.packageJson ? `## Dependencies\n\`\`\`json\n${JSON.stringify({ dependencies: ctx.packageJson.dependencies || {}, devDependencies: ctx.packageJson.devDependencies || {} }, null, 2)}\n\`\`\`` : ''}

${ctx.claudeMd ? `## Project Notes\n${ctx.claudeMd}` : ''}

## Your Task

Identify cleanup opportunities across these categories:

### 1. Dead Code
Files, functions, or exports that are defined but never used. Be specific — name the file and what to delete.

### 2. Duplicate / Near-duplicate Code
Logic that appears in multiple places and could be a shared utility. Name both locations and describe what to merge.

### 3. Unused Dependencies
Packages in package.json not actually imported anywhere. List each with the removal command.

### 4. Over-engineered Abstractions
Abstractions that add complexity without reuse. E.g. a class wrapping a single function, a config system for one value. For each: what to inline/simplify.

### 5. Stale Files
Old scaffolding, example files, leftover migration scripts, outdated docs. List files to delete.

## Output Format

For each finding:
**[Category]** \`path/to/file.ts\`
What to do: *exact action* (delete / merge into X / inline / replace with Y)
Estimated savings: *N lines / N files*
Safe to do: *Yes / Only after verifying X*

End with:
**Total cleanup potential**: ~N files, ~N lines removed
**Start here**: the single highest-impact cleanup action`;
}
