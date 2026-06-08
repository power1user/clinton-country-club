# State of the Codebase — v0.16.19 (2026-06-07)

This folder is a snapshot of where The Grounds / GroundsLive stands at the close of Phase 18 + Task #52.

## What's in here

| File | What it covers |
|---|---|
| **[01-codebase-size.md](01-codebase-size.md)** | LOC counts, file counts, top-10 largest files, 40-WPM typing-only analysis, velocity stats. |
| **[02-cost-analysis.md](02-cost-analysis.md)** | Realistic agency vs. vibe-coder pricing to deliver this codebase from scratch. Sourced ranges from Upwork, Arc.dev, Match.dev, BinaryMarvels, DesignRevision, VibeHackers (June 2026). |
| **[03-statistics.md](03-statistics.md)** | DB schema stats (51 tables, 156 RLS policies, 91 FKs, etc.), front-end stats, test counts, Edge Function inventory, full phase history v0.1→v0.16, productivity comparison. |
| **[04-feature-inventory.md](04-feature-inventory.md)** | Complete feature list: member PWA + admin surface + cross-cutting capabilities (auth, security, performance, reliability). |

## Top-line numbers

- **51,624 total LOC** (41,823 source + 11,153 docs + 387 tests + …)
- **51 DB tables**, **156 RLS policies**, **53 functions**, **96 migrations**
- **15 Edge Functions** deployed
- **47 React screens**, **35 components**, **30 custom hooks**
- **89 .jsx files**
- **56 / 56** Vitest tests passing
- **280 commits** over **23 calendar days** = **~1,818 LOC/day**
- **Industry-typical senior dev rate: 30–100 LOC/day** → ~**18–60× leverage**

## Realistic outside-hire cost to deliver this

| Approach | Mid estimate |
|---|---:|
| US agency (full service) | **$200K–$350K** |
| US senior freelancer (solo) | $150K–$200K |
| Senior vibe coder | **$50K–$80K** |
| Offshore agency | $80K–$130K |
| Entry-level vibe coder | $30K–$55K |

(Details + sources in [02-cost-analysis.md](02-cost-analysis.md).)
