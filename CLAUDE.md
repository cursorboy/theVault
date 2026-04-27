# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is also the **persistent memory file** for Claude Code sessions in this vault.

---

## Vault Structure

```
+Inbox/                        # Quick drop — process daily
Areas/
  Work/
    Projects/                  # One folder per project
    Meetings/                  # YYYY-MM-DD-[topic].md
    Session-Logs/              # Claude Code session archives
  Personal/
  Health/
Calendar/
  Daily/                       # YYYY-MM-DD.md
  Weekly/                      # YYYY-WXX.md
  Monthly/
System/
  Templates/
  Dashboards/
.worktrees/reelvault/          # Active code project (FastAPI + Next.js app)
```

## Code Project: thevault

Monorepo at `.worktrees/reelvault/`. API uses FastAPI/Python, web uses Next.js. Deployed on Railway.

- Infra: Postgres + pgvector, Redis, Cloudflare R2, Sendblue, Anthropic + OpenAI
- Local services: `docker compose up -d` (from `.worktrees/reelvault/`)
- Copy `.env.example` → `.env` before running

## Skills Available

| Skill | Purpose |
|---|---|
| `/resume` | Load context from this file + session logs |
| `/compress` | Save current session to `Areas/Work/Session-Logs/` |
| `/preserve` | Add permanent learnings to this file |
| `/daily-note` | Create/open `Calendar/Daily/YYYY-MM-DD.md` |
| `/meeting-note` | Create structured meeting note with frontmatter |
| `/inbox-process` | File items from `+Inbox/` |
| `/weekly-review` | Summarize week, create `Calendar/Weekly/` note |

## Frontmatter Standards

All notes use YAML frontmatter for automatic surfacing via Dataview:

```yaml
---
type: meeting | project | note | session | daily | weekly
date: YYYY-MM-DD
project: Project-Name
attendees: [name1, name2]   # meetings only
status: active | completed | on-hold | archived
tags: [tag1, tag2]
---
```

## Active Projects

<!-- Add projects here as they become active -->

## Key Decisions

<!-- Add architecture/workflow decisions here via /preserve -->

## Pending Tasks

<!-- Updated by /compress and /preserve -->
