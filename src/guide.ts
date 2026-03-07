import type { ProjectContext } from './types.js';

export type ProjectStage = 'research' | 'architecture' | 'building' | 'testing' | 'launch';

export function detectStage(context: ProjectContext): ProjectStage {
  const { stats, packageJson, fileTree, readme } = context;

  // No code at all → research
  if (!packageJson && stats.totalFiles < 3) return 'research';

  // Has package.json but very few files → architecture
  if (stats.totalFiles < 10) return 'architecture';

  // Has code but no tests → building
  if (stats.testFiles === 0) return 'building';

  // Has tests but no deployment/landing indicators → testing
  const hasDeployment = fileTree.includes('Dockerfile') ||
    fileTree.includes('docker-compose') ||
    fileTree.includes('.github/workflows') ||
    fileTree.includes('vercel.json') ||
    fileTree.includes('fly.toml');
  const hasLanding = fileTree.includes('landing') || fileTree.includes('Landing');

  if (!hasDeployment && !hasLanding) return 'testing';

  return 'launch';
}

const STAGE_LABELS: Record<ProjectStage, string> = {
  research: 'Research & Direction',
  architecture: 'Architecture & Planning',
  building: 'Building & Execution',
  testing: 'Testing & Validation',
  launch: 'Launch & Commercialization',
};

interface ChecklistItem {
  question: string;
  why: string;
  perspective: string;
}

const STAGE_CHECKLISTS: Record<ProjectStage, ChecklistItem[]> = {
  research: [
    { question: 'Who is your target user? Describe them in one sentence.', why: 'Without a clear user, you will build features nobody needs.', perspective: 'Product' },
    { question: 'How does this user solve this problem today?', why: 'If there is no existing behavior to replace, the need may not be real.', perspective: 'Product' },
    { question: 'What existing products serve this market? Have you tried them?', why: 'You need to know your competition before building. "No competition" usually means no market.', perspective: 'CTO' },
    { question: 'Can you describe your differentiation in one sentence?', why: 'If you cannot, users will not understand why to switch.', perspective: 'Customer' },
    { question: 'What is the absolute minimum version that proves this idea works?', why: 'Build the smallest thing that tests your riskiest assumption.', perspective: 'CTO' },
    { question: 'How will your first 10 users find this product?', why: 'Distribution is harder than building. Think about it before writing code.', perspective: 'Product' },
    { question: 'Is there anything in this idea that could be patented?', why: 'Early patent filing establishes priority date. Cost: $3K-10K. Worth evaluating before public launch.', perspective: 'CTO' },
  ],
  architecture: [
    { question: 'How many user roles/permission levels do you have? Do you need more than 2?', why: 'CodeLens planned 4 roles, only needed 2. Each extra role = 1-2 days of work.', perspective: 'CTO' },
    { question: 'List every feature. For each one: would a user notice if you removed it?', why: '60% of planned features in CodeLens were over-engineering. Cut them before building.', perspective: 'Product' },
    { question: 'How many database models do you have? Does each one earn its complexity?', why: 'Every model = migrations, seeds, tests, API endpoints. CodeLens has 20 — some could have been config objects.', perspective: 'CTO' },
    { question: 'Are you building auth/payments/email yourself? Should you use a service instead?', why: 'Supabase Auth / Stripe / Resend cost $0-20/month and save 1-2 weeks of build time.', perspective: 'DevOps' },
    { question: 'What is your deployment plan? Can you deploy with one command?', why: 'If deployment is manual and complex, you will avoid deploying, which means you will avoid testing with real users.', perspective: 'DevOps' },
    { question: 'What data are you collecting? Do you need a privacy/compliance page?', why: 'B2B customers will ask. Enterprise customers will require it. Add it to the plan now.', perspective: 'Security' },
    { question: 'Does your architecture have any novel approaches worth protecting as IP?', why: 'Patent applications should be filed before public disclosure. Identify IP candidates early.', perspective: 'CTO' },
  ],
  building: [
    { question: 'You have 0 tests. Which 3 features would break your product if they had bugs?', why: 'You do not need 100% coverage. You need tests on the 3 things that would make users leave.', perspective: 'CTO' },
    { question: 'Are you building features in priority order, or in "easy first" order?', why: 'Easy-first feels productive but delays risk. Build the hardest/riskiest thing first.', perspective: 'Product' },
    { question: 'Have you shown this to a single potential user yet?', why: 'Every day you build without user feedback is a day you might be building the wrong thing.', perspective: 'Customer' },
    { question: 'Is there any feature you have been stuck on for more than 1 day?', why: 'Being stuck usually means: wrong approach, not needed, or needs to be simplified.', perspective: 'CTO' },
    { question: 'How many third-party dependencies have you added? Is each one necessary?', why: 'Each dependency = security surface + maintenance burden + potential breaking changes.', perspective: 'Security' },
    { question: 'Are you handling errors and edge cases, or just the happy path?', why: 'In MVP, happy path is enough. Do not gold-plate error handling for scenarios that may never happen.', perspective: 'CTO' },
    { question: 'Is any of your AI-generated code doing something you do not understand?', why: 'Code you cannot explain is code you cannot debug. Flag it now.', perspective: 'Security' },
  ],
  testing: [
    { question: 'Have you personally used your product end-to-end as a real user would?', why: 'Automated tests check code works. Manual walkthrough checks the product makes sense.', perspective: 'Product' },
    { question: 'What are the 3 things a user must do successfully for this product to have value?', why: 'Test those 3 things manually. Everything else can wait.', perspective: 'Product' },
    { question: 'Can a non-technical person understand what this product does from the landing page?', why: 'If you have to explain it, the messaging is wrong.', perspective: 'Customer' },
    { question: 'What happens when things go wrong? Is there monitoring/alerting?', why: 'You will not be watching logs 24/7. Set up basic alerts for errors and downtime.', perspective: 'DevOps' },
    { question: 'Have you tested with real data, not just seed/demo data?', why: 'Real data has edge cases that demo data does not: unicode names, huge files, empty fields.', perspective: 'CTO' },
    { question: 'Is there a backup/recovery plan for user data?', why: 'Losing user data = losing users. Even a nightly DB dump to S3 is better than nothing.', perspective: 'DevOps' },
    { question: 'Are there security basics in place? HTTPS, input validation, auth on every endpoint?', why: 'One security incident kills trust permanently for a new product.', perspective: 'Security' },
  ],
  launch: [
    { question: 'Is pricing visible? Does a user know what they get for free vs paid?', why: 'Hidden pricing = "probably expensive" in users minds. Be transparent.', perspective: 'Product' },
    { question: 'What is your distribution channel? Where will you post on launch day?', why: 'Build it and they will NOT come. You need a plan: HN, Twitter, Reddit, communities.', perspective: 'Product' },
    { question: 'Do you have analytics to know if anyone is actually using the product?', why: 'Without analytics, you are flying blind. Even simple page view tracking helps.', perspective: 'DevOps' },
    { question: 'Is there a way for users to give feedback or report bugs?', why: 'Early users are your best source of product direction. Make it easy for them to talk to you.', perspective: 'Customer' },
    { question: 'What is your support plan? Who responds when a user has a problem?', why: 'Response time in the first week determines word-of-mouth.', perspective: 'Customer' },
    { question: 'Have you checked for legal requirements? Terms of service? Privacy policy?', why: 'B2B buyers will check. Missing legal pages = "not professional enough."', perspective: 'Security' },
    { question: 'Are there patentable innovations you should file before going public?', why: 'Public disclosure starts a 1-year clock (US) or kills patentability (most other countries).', perspective: 'CTO' },
  ],
};

export function buildGuidePrompt(context: ProjectContext): string {
  const stage = detectStage(context);
  const label = STAGE_LABELS[stage];
  const checklist = STAGE_CHECKLISTS[stage];

  const lines = [
    `# Project Guide: ${context.name}`,
    '',
    `**Detected Stage**: ${label}`,
    `**Tech Stack**: ${context.techStack.join(', ') || 'Not detected'}`,
    `**Scale**: ${context.stats.totalFiles} files, ${context.stats.testFiles} tests, ~${context.stats.codeLines} lines`,
    '',
    '---',
    '',
    `## Questions You Should Be Asking (${label} Stage)`,
    '',
    'Go through each question. For any you cannot answer confidently, that is a gap to address.',
    '',
  ];

  for (let i = 0; i < checklist.length; i++) {
    const item = checklist[i];
    lines.push(
      `### ${i + 1}. ${item.question}`,
      `**Why this matters**: ${item.why}`,
      `*Source: ${item.perspective} perspective*`,
      '',
    );
  }

  lines.push(
    '---',
    '',
    '## What to do with this',
    '',
    'For each question above:',
    '1. If you can answer it confidently → move on',
    '2. If you cannot answer it → add it to your todo list as a task to resolve',
    '3. If the answer reveals a problem → add the fix to your todo list',
    '',
    'Use the `todo_add` tool to add items, or ask me to add them for you.',
    '',
    'After addressing these questions, run a `review` for deeper analysis from all 5 perspectives.',
  );

  return lines.join('\n');
}
