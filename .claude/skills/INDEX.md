# CineDramas Skills Index

Skills provide segmented domain knowledge from the CineDramas Architecture Blueprint. Each skill contains a SKILL.md (instructions + trigger description) and a references/ directory with detailed sub-documents.

## Skills

| Skill | Purpose | Key Sections |
|-------|---------|-------------|
| [cinedramas-architecture](./cinedramas-architecture/SKILL.md) | System design, component boundaries, Silhouette vs Hub models, data flows | Sections 1, 2, 4, 5, 6 |
| [cinedramas-db-schema](./cinedramas-db-schema/SKILL.md) | Data models, entity relationships, RLS policies, indexes, migrations | Sections 7, 8 |
| [cinedramas-api-conventions](./cinedramas-api-conventions/SKILL.md) | API surface contracts, request lifecycle, caching, error handling, webhooks | Sections 4, 5.3 |
| [cinedramas-feature-tickets](./cinedramas-feature-tickets/SKILL.md) | Implementation roadmap (5 phases) and micro-level task breakdown (T1-T5) | Sections 11, 12 |
| [cinedramas-stack-guide](./cinedramas-stack-guide/SKILL.md) | Deep explanations of each technology: why chosen, how it works, integration | Section 3 |
| [cinedramas-testing-strategy](./cinedramas-testing-strategy/SKILL.md) | Test conventions, RLS isolation tests, security audit, monitoring setup | Sections 8.3, 9.5, 14 |
| [cinedramas-infrastructure](./cinedramas-infrastructure/SKILL.md) | Hosting, environments, deployment pipelines, secrets, CI/CD, dev setup | Sections 9, 10 |

## How to Use

- Before starting a feature or task, check the relevant skill for architectural context
- Reference `cinedramas-feature-tickets` to find the task ID and dependencies
- Reference `cinedramas-db-schema` before writing any migration or RLS policy
- Reference `cinedramas-api-conventions` before implementing an edge function
- Reference `cinedramas-stack-guide` for integration patterns of specific libraries
