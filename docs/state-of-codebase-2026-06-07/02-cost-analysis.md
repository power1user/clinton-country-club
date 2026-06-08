# Cost Analysis — What This Would Have Cost to Hire Out

*Snapshot taken 2026-06-07 (v0.16.19). All rates in USD, sourced June 2026.*

## Approach

Two parallel pricings:

1. **Traditional dev/agency hire** — what a US-based dev shop, freelancer, or internal hire would charge to deliver this codebase from scratch.
2. **"Vibe coder" hire** — what someone with AI-assisted workflow (Claude / Cursor / Copilot etc.) would charge to deliver the same.

For each, I'm giving a **realistic, defensible** range, not a wow-factor number. I'm also accounting for the fact that what you actually have is more complex than a basic CRUD SaaS — multi-tenant with RLS, push notifications, AI integration, audit logs, Edge Functions, role-based permissions, a security-hardening pass, code splitting, etc.

---

## Traditional dev/agency hire

### Market rates (June 2026)

| Source | Rate | Notes |
|---|---|---|
| US senior freelancer | $100–$175 / hr | Solo, no PM, no QA |
| US dev agency (mid) | $125–$200 / hr | Includes PM + QA + design polish |
| US dev agency (top) | $200–$300 / hr | Tier-1 shops, full team |
| Eastern Europe agency | $50–$100 / hr | Common offshore alternative |
| India / SEA agency | $25–$75 / hr | Cheapest tier; quality varies wildly |

### Effort estimate

Based on the codebase size analysis ([01-codebase-size.md](01-codebase-size.md)):
- **8× typing-time multiplier** (realistic for production-quality work) = **~1,270 hours**
- For a multi-tenant SaaS with security hardening + AI + push + RLS, industry-grade work typically takes **1,000–2,000 hours**.

### Realistic cost ranges

| Hire model | Rate | Hours | **Total** |
|---|---|---:|---:|
| US senior freelancer (low) | $100/hr | 1,200 | **$120,000** |
| US senior freelancer (avg) | $135/hr | 1,400 | **$189,000** |
| US dev agency (mid) | $165/hr | 1,500 | **$247,500** |
| US dev agency (top tier) | $225/hr | 1,400 | **$315,000** |
| Eastern Europe agency | $75/hr | 1,700 | **$127,500** |
| India/SEA agency | $40/hr | 2,000 | **$80,000** |

**Middle estimate for a US-based hire: $150,000–$250,000.**

This aligns with public agency quotes for "B2B multi-tenant SaaS MVP, 3–6 months": [DesignRevision](https://designrevision.com/blog/how-much-does-it-cost-to-build-a-saas) cites **$50K–$120K for a basic SaaS MVP** and notes "multi-tenant architecture, role-based access control, third-party integrations increase complexity and cost compared to basic MVPs." [BinaryMarvels](https://binarymarvels.com/how-much-does-saas-development-cost/) puts agency-built B2B SaaS at **$50K–$150K**.

The Grounds has **more** than the basic feature set those quotes describe (push notifications, AI-integrated admin/member chat, audit logs, security-hardening pass, Phase 18 14-finding audit, etc.) — so the realistic price is on the **upper end or beyond** their ranges.

### What's NOT in those numbers

- Ongoing maintenance ($2–5K/month for a US shop on retainer)
- Design / UX consulting (usually $80–$200/hr, often $20–40K for a project this size)
- Project management overhead (15–25% of dev cost in an agency model)
- Discovery / requirements phase (typically 40–80 hours = $4–16K)
- The "third revision" cost — agency clients usually pay for at least one major scope-change midstream

If you wanted the same outcome from an agency, with PM + design + revisions, **realistic all-in: $200K–$350K**.

---

## "Vibe coder" hire (AI-assisted freelancer)

### Market rates (June 2026)

| Source | Rate | Notes |
|---|---|---|
| Match.dev vibe coders | $50–$80 / hr | Entry-level AI-assisted, 48hr start |
| Arc.dev vibe coders | $60–$100 / hr | Pre-vetted |
| Upwork mid-market | $75–$150 / hr | Typical band |
| Specialist consultants | $200–$400 / hr | Senior AI dev consultants; "translate messy requirements into working product in days" — [VibeHackers](https://vibehackers.io/blog/vibe-coding-salary-guide) |

### Effort estimate

Vibe coders ship faster — typing isn't the constraint, AI is. Real-world delivery rates suggest **2–4× faster** than traditional dev for greenfield work like this.

- **Effort: ~400–700 hours** (vs. 1,270 traditional)
- Quality bar still depends on the human's experience; a senior vibe coder gets to the same place faster, a junior gets there in a different (often worse) state.

### Realistic cost ranges

| Tier | Rate | Hours | **Total** |
|---|---|---:|---:|
| Entry-level vibe coder | $75/hr | 700 | **$52,500** |
| Mid vibe coder | $100/hr | 500 | **$50,000** |
| Senior vibe coder | $150/hr | 450 | **$67,500** |
| Specialist AI consultant | $250/hr | 400 | **$100,000** |

**Middle estimate for a senior vibe coder: $50,000–$80,000.**

The honest caveat: a senior vibe coder might deliver something that *looks* like this codebase faster, but the **architecture quality** here — multi-tenant RLS, defense-in-depth security, BEFORE INSERT triggers, expand-and-contract migration patterns, prompt-cached AI manuals, the things in Phase 18 — isn't what most vibe coders ship. Cheaper tiers often produce code that works in the demo and falls over in production. A vibe coder at $75–100/hr might give you "this app, working" but not "this app, surviving 50 clubs."

### What you'd lose at the bargain tier

- **Security hardening** (CORS allowlists, rate limiting, audit logs, RLS verified by tests) — usually skipped at $75/hr
- **Migration discipline** (8 migrations with full SQL files in repo, applied + verified) — usually replaced with "click around the Supabase UI"
- **Tests** (56 Vitest tests across 3 surfaces) — usually skipped entirely
- **Edge Function deployment + secrets management** — often shortcut with hard-coded values
- **The Phase 18 security pass itself** — 14 findings closed across 3 audit rounds, ~11 patches

These show up later as outages, security incidents, or "we have to rewrite this part."

---

## Side-by-side summary

| Approach | Realistic mid estimate | What you get |
|---|---:|---|
| **US agency (full service)** | **$200K–$350K** | PM, design, QA, code, ongoing support model. Slow. |
| US senior freelancer (solo) | $150K–$200K | Code-only, no PM/design. 4–6 months. |
| Offshore (EE) agency | $100K–$160K | Code + light PM. Time-zone friction. |
| **Senior vibe coder** | **$50K–$80K** | Code-only, faster, comparable architecture if the dev is good. |
| Entry-level vibe coder | $30K–$55K | Risky — works in demo, may not survive scale. |
| Offshore (India/SEA) | $50K–$100K | Highly variable quality. |
| **What you actually paid (Claude API + your time)** | **~$3K–6K all-in** | API + your hours. (See AI-leverage note in [03-statistics.md](03-statistics.md).) |

---

## TL;DR

**If you had hired this out:**
- Realistic US agency price: **$200K–$350K**
- Realistic senior vibe coder price: **$50K–$80K**
- Realistic offshore agency: **$80K–$130K**

**What you actually spent:**
- A few thousand dollars in API costs + your time
- That's a **30–100× delta** vs. agency, **8–15× delta** vs. a senior vibe coder

The savings aren't free — you traded money for hours of your own time, plus the cognitive load of being the product manager, QA, and security reviewer yourself. But the dollar delta is real.

---

## Sources

- [How Much Does SaaS Development Cost in 2026? — BinaryMarvels](https://binarymarvels.com/how-much-does-saas-development-cost/)
- [How Much Does It Cost to Build a SaaS? (2026) — DesignRevision](https://designrevision.com/blog/how-much-does-it-cost-to-build-a-saas)
- [SaaS Development Cost in 2026: The Honest Breakdown — UXContinuum](https://uxcontinuum.com/blog/saas-development/saas-development-cost-2026)
- [Vibe Coding Salary Guide 2026 — VibeHackers](https://vibehackers.io/blog/vibe-coding-salary-guide)
- [Hire Vibe Coders | AI-First | Match.dev](https://www.match.dev/hire-developers/vibe-coders)
- [Cost to Hire Vibe Coding Engineers 2025 — ExcellentWebWorld](https://www.excellentwebworld.com/cost-to-hire-vibe-coding-engineers/)
- [Best Freelance Vibe Coding Developers — Arc.dev](https://arc.dev/hire-developers/vibe-coding)
- [PWA Development Cost in 2026 — Doomshell](https://www.doomshell.com/blog/pwa-development-cost-in-2026/)
