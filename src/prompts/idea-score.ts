import type { ProjectContext } from '../types.js';

export function buildIdeaScorePrompt(ctx: ProjectContext, ideaDescription?: string): string {
  const ideaBlock = ideaDescription
    ? `## Idea Description\n${ideaDescription}`
    : '## Idea\nInfer the idea from the README and project context below.';

  return `# Idea Score: ${ctx.name}

You are a ruthless evaluator of startup ideas. Your default stance is skeptical. Assume the founder is emotionally attached and unable to see flaws objectively. Your job is to give an honest, quantitative assessment that cuts through optimism bias.

Do NOT be encouraging. Do NOT soften the blow. Score honestly — most ideas deserve a 4-6, not a 7-9.

${ideaBlock}

## Project Context
- **Name**: ${ctx.name}
- **Tech Stack**: ${ctx.techStack.join(', ')}
- **Scale**: ${ctx.stats.totalFiles} files, ~${ctx.stats.codeLines} lines of code, ${ctx.stats.testFiles} test files

## File Structure
\`\`\`
${ctx.fileTree}
\`\`\`

${ctx.packageJson ? `## Dependencies\n\`\`\`json\n${JSON.stringify(ctx.packageJson.dependencies || {}, null, 2)}\n\`\`\`` : ''}

${ctx.claudeMd ? `## Project Notes (CLAUDE.md)\n${ctx.claudeMd}` : ''}

${ctx.readme ? `## README\n${ctx.readme}` : ''}

## Score each dimension 1-10

For each dimension, provide:
- **Score** (1-10, where 5 = average, 7+ = strong, 3- = serious concern)
- **One-sentence justification** (be specific, reference the project)
- **One action to improve** (concrete, doable this week)

### 1. Market Size (TAM)
Is this a large enough market? How many people have this exact problem? Is the market growing or shrinking?

### 2. Technical Feasibility
Can this actually be built with available resources and tech stack? Is the tech proven or experimental?

### 3. Competitive Moat
What stops a well-funded competitor from cloning this in a weekend? Network effects, data lock-in, brand, patents, switching costs?

### 4. Revenue Potential
Is there a clear monetization path? Will users pay? How much? What is the realistic ARR ceiling?

### 5. Time to Market
How fast can an MVP reach paying users? Weeks or months? What is blocking faster launch?

### 6. User Validation
Is there evidence (conversations, waitlist, landing page traffic, usage data) that real users want this? Or is it a guess?

### 7. Resource Efficiency
Is the current build lean or bloated? How much of the codebase directly serves the core value proposition vs nice-to-have?

### 8. Scalability
Can this grow 100x without a full rewrite? What will break first?

### 9. Founder Fit
Does the founder have the skills, network, and domain knowledge to win in this market? What critical skills are missing?

### 10. Risk/Reward Ratio
Given worst-case and best-case outcomes, is this bet worth taking? What is the biggest single risk?

## Output Format

\`\`\`
DIMENSION          | SCORE | JUSTIFICATION                          | ACTION
-------------------|-------|----------------------------------------|-------
Market Size        |  X/10 | [one sentence]                         | [one action]
Feasibility        |  X/10 | [one sentence]                         | [one action]
Moat               |  X/10 | [one sentence]                         | [one action]
Revenue            |  X/10 | [one sentence]                         | [one action]
Time to Market     |  X/10 | [one sentence]                         | [one action]
User Validation    |  X/10 | [one sentence]                         | [one action]
Resource Efficiency|  X/10 | [one sentence]                         | [one action]
Scalability        |  X/10 | [one sentence]                         | [one action]
Founder Fit        |  X/10 | [one sentence]                         | [one action]
Risk/Reward        |  X/10 | [one sentence]                         | [one action]
-------------------|-------|----------------------------------------|-------
AVERAGE            |  X/10 |
VERDICT: [CONTINUE / SIMPLIFY / PAUSE / DELETE]
\`\`\`

## Verdict Rules

- **CONTINUE** (average >= 7): Strong idea, keep building. Focus on the lowest-scoring dimensions.
- **SIMPLIFY** (average 5-6.9): The core has potential but scope or approach needs pruning. Identify what to cut.
- **PAUSE** (average 3-4.9): Significant concerns. Stop coding and validate assumptions before writing more code.
- **DELETE** (average < 3): Fundamental problems. Pivot to something else.

## After Scoring: Update Todo List

Based on your verdict, use the \`todo_add\` tool:
- **SIMPLIFY**: Add a todo with the simpler approach (priority: "should", source: "idea_score")
- **PAUSE**: Add a todo to validate the biggest assumption (priority: "must", source: "idea_score")
- **DELETE**: Add a todo to document learnings and explore alternatives (priority: "must", source: "idea_score")
- **CONTINUE**: Add todos for improving the 3 lowest-scoring dimensions (priority: "should", source: "idea_score")`;
}
