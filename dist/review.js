import { ALL_PERSPECTIVES } from './types.js';
import { ctoBuildPrompt } from './prompts/cto.js';
import { securityBuildPrompt } from './prompts/security.js';
import { productBuildPrompt } from './prompts/product.js';
import { devopsBuildPrompt } from './prompts/devops.js';
import { customerBuildPrompt } from './prompts/customer.js';
const PROMPT_BUILDERS = {
    cto: ctoBuildPrompt,
    security: securityBuildPrompt,
    product: productBuildPrompt,
    devops: devopsBuildPrompt,
    customer: customerBuildPrompt,
};
const PERSPECTIVE_LABELS = {
    cto: 'CTO / Technical Leadership',
    security: 'Security Expert',
    product: 'Product / Business Expert',
    devops: 'DevOps / Infrastructure Expert',
    customer: 'Target Customer',
};
export function buildReviewPrompt(context, perspectives, customerRole) {
    const selected = perspectives && perspectives.length > 0
        ? perspectives
        : ALL_PERSPECTIVES;
    const sections = selected.map(p => {
        const builder = PROMPT_BUILDERS[p];
        const prompt = builder(context, customerRole);
        const label = PERSPECTIVE_LABELS[p];
        return `\n## ${label} Review\n\n${prompt}`;
    });
    const header = [
        `# Architecture Review: ${context.name}`,
        '',
        `**Tech Stack**: ${context.techStack.join(', ') || 'Not detected'}`,
        `**Files**: ${context.stats.totalFiles} | **Tests**: ${context.stats.testFiles} | **Code Lines**: ~${context.stats.codeLines}`,
        '',
        '---',
        '',
        'Please conduct the following reviews. For each perspective, categorize findings as:',
        '- **MUST FIX**: Critical issues blocking production readiness',
        '- **SHOULD FIX**: Important improvements with clear ROI',
        '- **GOOD**: Confirmed correct decisions worth keeping',
        '',
        'Be specific: reference file paths, function names, and line numbers where possible.',
        'Estimate effort saved or cost of inaction for each finding.',
    ].join('\n');
    return header + '\n' + sections.join('\n\n---\n');
}
//# sourceMappingURL=review.js.map