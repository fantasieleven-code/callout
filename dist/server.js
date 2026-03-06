#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { collectContext } from './context.js';
import { buildReviewPrompt } from './review.js';
const server = new McpServer({
    name: 'archon',
    version: '0.1.0',
});
server.tool('review', 'Multi-perspective architecture review. Analyzes project structure, dependencies, and code to produce actionable findings from expert viewpoints (CTO, Security, Product, DevOps, Customer).', {
    perspectives: z
        .array(z.enum(['cto', 'security', 'product', 'devops', 'customer']))
        .optional()
        .describe('Which perspectives to include. Defaults to all five.'),
    customer_role: z
        .string()
        .optional()
        .describe('Description of target customer for the customer perspective. E.g. "a startup CTO evaluating CI tools"'),
    project_path: z
        .string()
        .optional()
        .describe('Path to the project to review. Defaults to current working directory.'),
}, async ({ perspectives, customer_role, project_path }) => {
    const cwd = project_path || process.cwd();
    try {
        const context = await collectContext(cwd);
        const prompt = buildReviewPrompt(context, perspectives, customer_role);
        return {
            content: [{ type: 'text', text: prompt }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Error collecting project context: ${message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('Archon server failed to start:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map