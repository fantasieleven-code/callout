import type { ProjectContext } from '../types.js';

export function devopsBuildPrompt(ctx: ProjectContext): string {
  return `You are a senior DevOps/SRE engineer reviewing this project for production readiness.

## Project Context
- **Name**: ${ctx.name}
- **Tech Stack**: ${ctx.techStack.join(', ')}
- **Scale**: ${ctx.stats.totalFiles} files, ~${ctx.stats.codeLines} lines of code, ${ctx.stats.testFiles} test files

## File Structure
\`\`\`
${ctx.fileTree}
\`\`\`

${ctx.packageJson ? `## Dependencies & Scripts\n\`\`\`json\n${JSON.stringify({ scripts: ctx.packageJson.scripts || {}, dependencies: ctx.packageJson.dependencies || {} }, null, 2)}\n\`\`\`` : ''}

${ctx.claudeMd ? `## Project Notes (CLAUDE.md)\n${ctx.claudeMd}` : ''}

## Your Review Focus

1. **Deployment Complexity**: How many steps to go from clone to running in production? What can be automated? Is there a Dockerfile, docker-compose, or deployment config?

2. **Environment Configuration**: Are environment variables documented? Are there .env.example files? Are defaults safe for production?

3. **Monitoring & Observability**: Is there health check endpoint? Structured logging? Error tracking integration? What would you know (and not know) if something breaks at 3 AM?

4. **Backup & Recovery**: Database backup strategy? Can you restore from a point in time? What's the disaster recovery plan?

5. **CI/CD Pipeline**: Are there automated tests? Linting? Build verification? What gates exist before code reaches production?

6. **Resource Efficiency**: Are there obvious memory leaks, unbounded queues, or missing connection pools? What would happen under sustained load?

For each finding, categorize as MUST FIX / SHOULD FIX / GOOD with specific operational recommendations.`;
}
