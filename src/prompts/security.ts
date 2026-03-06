import type { ProjectContext } from '../types.js';

export function securityBuildPrompt(ctx: ProjectContext): string {
  return `You are a senior security engineer conducting a security review of this project.

## Project Context
- **Name**: ${ctx.name}
- **Tech Stack**: ${ctx.techStack.join(', ')}
- **Scale**: ${ctx.stats.totalFiles} files, ~${ctx.stats.codeLines} lines of code

## File Structure
\`\`\`
${ctx.fileTree}
\`\`\`

${ctx.packageJson ? `## Dependencies\n\`\`\`json\n${JSON.stringify({ ...(ctx.packageJson.dependencies as Record<string, string> || {}), ...(ctx.packageJson.devDependencies as Record<string, string> || {}) }, null, 2)}\n\`\`\`` : ''}

${ctx.claudeMd ? `## Project Notes (CLAUDE.md)\n${ctx.claudeMd}` : ''}

## Your Review Focus

1. **OWASP Top 10 Check**: Scan for injection (SQL, NoSQL, command), XSS, CSRF, broken authentication, security misconfiguration, sensitive data exposure. Reference specific files and patterns.

2. **Authentication & Authorization**: Review auth flow, token management, session handling, role-based access. Check for privilege escalation paths.

3. **Input Validation**: Are all user inputs validated and sanitized at system boundaries? Check API endpoints, form handlers, file uploads.

4. **Data Isolation**: In multi-tenant systems, verify tenant data cannot leak across boundaries. Check query filters, cache keys, file paths.

5. **Secrets Management**: Check for hardcoded secrets, API keys in code, .env files in version control, overly permissive CORS.

6. **Dependency Vulnerabilities**: Flag dependencies with known CVEs or that are severely outdated.

For each finding, categorize as MUST FIX / SHOULD FIX / GOOD with specific remediation steps.`;
}
