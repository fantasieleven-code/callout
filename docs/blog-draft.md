# AI-Written Code Has 1.7x More Issues — You Need a Second Pair of Eyes

> Draft blog post for dev.to / Medium / personal blog

---

## The 6-day product that should have taken 3.5

Last week I built a complete SaaS product using Claude Code. In 6 days, I had:

- 186 files across frontend and backend
- 691 automated tests, all passing
- Full authentication with role-based access control (4 levels)
- Stripe billing integration with database-backed plans
- Audit logging for compliance
- Multi-tenant data isolation

I felt like a superhero. An entire engineering team's output, from one person with an AI coding assistant.

Then I ran a multi-perspective architecture review. Five simulated experts — CTO, Security Engineer, Product Manager, DevOps Lead, and a potential Customer — each examined the codebase independently.

**The verdict: 60% of the code was unnecessary.**

## What went wrong

The CTO perspective was brutal:

- **4-level role system**: The product had Admin, Manager, Reviewer, and Viewer roles. Actual need? Admin and User. Two levels. The other two added 3 days of work for a feature no user asked for.

- **Full billing database schema**: Stripe handles plan management. I built a parallel system with migrations, models, and API endpoints. A config object mapping plan IDs to feature flags would have taken 20 minutes.

- **Audit logging**: Zero users, zero compliance requirements, zero regulatory need. Pure speculation about future enterprise customers that don't exist.

The Security review found real issues too — JWT tokens missing organization IDs meant multi-tenant data could leak across tenants. But even the security findings were inflated by the unnecessary complexity: more code = more attack surface.

**9 days of planned work reduced to 3.5 days of actual need.**

## The real bottleneck isn't code speed

AI coding tools solved the wrong problem. We don't need to write code faster — we need to know what NOT to build.

When you're pair-programming with AI, there's no product manager pushing back on scope. No CTO asking "do we need this in V1?" No customer saying "I would never use this feature." The AI builds whatever you ask for, perfectly and quickly.

This is the new failure mode: **over-engineering at the speed of light**.

## The pattern I keep seeing

After talking to other indie hackers and solo founders using AI coding tools, the pattern is consistent:

1. Start with a clear MVP scope
2. AI makes building so fast that scope creep feels free
3. "While we're at it, let's add..." becomes the default
4. Ship a product that's 2-3x larger than needed
5. Spend weeks maintaining features nobody uses

The traditional startup advice — "ship fast, iterate based on feedback" — gets subverted. You ship fast, but you ship too much. And all that extra code has maintenance cost, security surface, and cognitive overhead.

## What I built about it

I turned that multi-perspective review into an open-source tool called **Callout**.

It's an MCP server that works inside Claude Code, Cursor, VS Code, and Windsurf. It gives you:

**5-perspective architecture review** — CTO, Security, Product, DevOps, and Customer viewpoints. Each finding is categorized as MUST FIX, SHOULD FIX, or GOOD with effort estimates.

**Product challenge** — Before you spend another hour on a feature, Callout checks the ROI. Returns CONTINUE, SIMPLIFY, PAUSE, or DELETE.

**Stage-aware guidance** — Detects whether you're in research, architecture, building, testing, or launch phase and surfaces the right questions for that stage.

**Auto-triggers** — After setup, Callout automatically speaks up when you're editing the same file for the 3rd time, creating unnecessary modules, or spending too long on a bug fix.

The key design decision: **Callout never calls an LLM itself**. It assembles expert-perspective prompts and lets your existing AI tool execute them. Zero API cost. No API key needed.

## How to try it

```bash
npx callout-dev setup
```

30 seconds. Auto-detects your editor. Sets up smart triggers. Runs a quick CTO review immediately.

14 tools, 63 tests, AGPL open source.

GitHub: [github.com/fantasieleven-code/callout](https://github.com/fantasieleven-code/callout)

---

*If you're building with AI and shipping without a second opinion, you're probably over-building. The question isn't "can AI build this?" — it's "should you?"*
