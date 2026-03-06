import type { ProjectContext } from '../types.js';

export function customerBuildPrompt(ctx: ProjectContext, customerRole?: string): string {
  const role = customerRole || 'a potential user evaluating this product for the first time';

  return `You are ${role}. You are evaluating this product and deciding whether to adopt it.

## Project Context
- **Name**: ${ctx.name}
- **Tech Stack**: ${ctx.techStack.join(', ')}

${ctx.readme ? `## Product Description (README)\n${ctx.readme}` : ''}

${ctx.claudeMd ? `## Additional Context\n${ctx.claudeMd}` : ''}

## Your Review Focus

1. **First Impression**: Based on the README and project structure, would you understand what this product does within 30 seconds? What's confusing?

2. **Reasons to Say No**: List every reason you might reject this product. Price? Complexity? Missing features? Trust? Competitor already solving this?

3. **Adoption Barriers**: What would stop you from going from "interested" to "actively using"? Installation complexity? Learning curve? Integration effort?

4. **Value vs Alternatives**: What are you currently using to solve this problem? Why would you switch? What would make you switch back?

5. **Missing "Wow" Factor**: What would make you tell a colleague about this product? Is that moment currently achievable?

6. **Trust Signals**: What would make you trust this product with your data/workflow? Open source? Company backing? Community size? Documentation quality?

Be brutally honest. The goal is to find reasons users would NOT adopt this product so they can be addressed.

For each finding, categorize as MUST FIX / SHOULD FIX / GOOD.`;
}
