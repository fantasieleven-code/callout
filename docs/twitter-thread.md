# Twitter Thread Draft

> Target: Developer / indie hacker audience
> Hook: Real story, real numbers

---

**1/7**
I used AI to build a complete product in 6 days.

186 files. 691 tests. Full authentication, role-based access, billing system.

Then I ran a multi-perspective review and found out 60% of it was over-engineered.

Here's what happened:

---

**2/7**
Day 1-4: Claude Code was blazing fast. "Add RBAC with 4 role levels." Done. "Add billing with Stripe." Done. "Add audit logging." Done.

I felt incredibly productive. Every feature worked. Tests passed.

The problem? Nobody asked "should we build this?"

---

**3/7**
Day 5: I simulated 5 expert reviews — CTO, Security, Product, DevOps, Customer.

The CTO perspective alone killed 40% of the code:
- 4-level role system? Only needed 2
- Full billing DB schema? A config object was enough
- Audit logging? Zero users, zero compliance requirements

---

**4/7**
9 days of planned work → 3.5 days of actual need.

The insight hit hard: **AI makes you 10x faster at building the wrong thing.**

The bottleneck was never code speed. It was knowing what NOT to build.

---

**5/7**
So I built Callout — an MCP server that gives you 5 expert perspectives on your project:

- CTO: over-engineering, technical debt
- Security: OWASP, auth gaps, data leaks
- Product: missing features, wrong priorities
- DevOps: deployment, monitoring gaps
- Customer: why users would say no

---

**6/7**
How it works:
- `npx callout-dev setup` — 30 seconds
- Works inside Claude Code, Cursor, VS Code, Windsurf
- Auto-triggers when you're going in circles
- Zero API cost (uses your existing AI model)
- 14 tools, 63 tests, open source (AGPL)

---

**7/7**
If you're building with AI and shipping without a second opinion, you're probably over-building.

Try it: `npx callout-dev setup`

GitHub: github.com/fantasieleven-code/callout
npm: npmjs.com/package/callout-dev

Star it if this resonates. Feedback welcome.
