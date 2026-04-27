# ReelVault — Full Project Document

> An iMessage / Instagram / TikTok AI assistant that ingests short-form video URLs, processes them into a searchable, categorized, semantically indexed library, builds a long-term memory of the user, and responds in natural gen-z text. A dashboard surfaces the library visually.

---

## 1. The One-Liner

You forward a TikTok or Instagram reel to ReelVault. ReelVault watches it, transcribes it, summarizes it, categorizes it, embeds it for semantic search, remembers it, and chats with you about it like a friend who's actually seen everything you save. Forever searchable, recallable on demand, and tied into a memory layer that grows over time.

---

## 2. What Problem It Solves

Short-form content is consumed at firehose speed but acted on at near-zero rate. People save reels they "want to remember" — recipes, workouts, restaurants, life advice, places, products, ideas — and never see them again. The save folder becomes a graveyard.

ReelVault treats every saved reel as a structured artifact:
- A **transcript** (what was said)
- A **summary** (what it was about)
- A **category** (recipes, fitness, places to eat, professional, etc.)
- An **embedding** (queryable by meaning, not keywords)
- A **set of memories** extracted from it (user wants to try X, user is into Y)
- **Action items** the user might take (book a table, try a recipe, do a workout)
- **Reminders** the user can set in natural language

Then it ties it all to a chat assistant that has real memory, web search, vision, and a stable voice. The user can ask "what was that ramen spot in nyc i saved" or "remind me about the pull-up workout next monday" and it just works.

---

## 3. The Aesthetic / Voice Spec

Critical to what makes the product feel different. Encoded in `apps/api/app/services/ai_assistant.py:SYSTEM_PROMPT` and enforced post-hoc by `_sanitize_voice()`.

- **all lowercase**, no caps
- **no em dashes**, no emojis, no exclamation points
- **no markdown** in iMessage / IG / TT replies (lists, bold, italics get sanitized out)
- **gen-z casual**: "ngl", "fr", "lowkey", "u", "lemme", contractions everywhere
- **never assume**: if a user message is ambiguous, ask, don't infer
- **never lecture**: short replies, no AI-assistant-y "as an AI" energy
- **error variety**: 14 different error replies via `_random_error()` so the UX doesn't repeat itself when things break
- **profile building**: assistant casually asks for name, location, interests over time and stores them in `users.profile` (jsonb)
- **read-receipts + typing indicator**: fire instantly via Sendblue when a webhook lands, so the user sees "read" within ~1s and a typing bubble that persists for the whole AI call (refreshed every 4s by `_typing_loop`)

---

## 4. High-Level Architecture

```
                                                           +--------------------------+
                                                           |   Cloudflare R2 (S3)     |
                                                           |   thumbnails             |
                                                           +-----------^--------------+
                                                                       |
+---------+        +------------+       +------------+      +----------+----------+      +-------------------+
| iMessage|------->| Sendblue   |------>|  FastAPI   |----->|  Postgres + pgvector|<-----| RQ worker         |
| (phone) |  HMAC  | Webhooks   |  POST |  /webhook  |  R/W |  (Neon in prod)     | R/W  | (process_video,   |
+---------+        +------------+       +------------+      +----------+----------+      |  send_reminder)   |
                                                                       ^                  +---------+---------+
+---------+        +------------+       +------------+                 |                            |
| IG DM   |<-----> | instagrapi |<----->|  ig bot    |---------------->|<---------------------------+
| (burner)| poll   | (mobile API)|       | (long-run) |  enqueue       |
+---------+        +------------+       +------------+                 |
                                                                       |
+---------+        +------------+       +------------+                 |
| TikTok  |<-----> | Playwright |<----->|  tt bot    |---------------->|
| DM      | poll   | (chromium) |        | (long-run) |
+---------+        +------------+       +------------+                 |
                                                                       |
                                          +------------+               |
                                          | Anthropic  |  chat / tool  |
                                          | (Claude)   |<-------+      |
                                          +------------+        |      |
                                          +------------+        |      |
                                          | OpenAI     |  embed |      |
                                          | (Whisper + |<-------+------+
                                          |  embed)    |
                                          +------------+
                                                                       |
                                          +------------+               |
                                          | Redis      |  queue + caches
                                          | (Upstash   |<--------------+
                                          |  in prod)  |
                                          +------------+
                                                                       |
                                          +------------+               |
                                          | Next.js    |  REST + auth  |
                                          | dashboard  |<--------------+
                                          | (Vercel)   |
                                          +------------+
```

### Components

- **FastAPI API server** (`apps/api`): webhook receiver, REST endpoints for the dashboard, internal cron endpoints, account linking.
- **RQ worker** (`apps/api/worker.py`): consumes the `default` queue, runs `process_video` and `send_reminder` jobs. Uses `SimpleWorker` (no fork) for macOS dev compatibility.
- **Instagram bot** (`apps/api/instagram_bot.py`): long-running process polling IG DMs via `instagrapi` (mobile API).
- **TikTok bot** (`apps/api/tiktok_bot.py`): long-running process driving headless Chromium via Playwright at `tiktok.com/messages`.
- **Next.js dashboard** (`apps/web`): visual library, search, category filtering, save details.
- **Postgres + pgvector** (Neon): primary store + vector index for embeddings.
- **Redis** (Upstash): RQ queue, outbox lists for IG/TT outbound, ephemeral state.
- **Cloudflare R2**: thumbnail storage (S3-compatible).
- **Anthropic Claude**: chat (haiku-4-5), reactions/extraction (sonnet-4-6), occasionally opus-4-7. Uses server-side `web_search_20250305` tool + multimodal vision.
- **OpenAI**: Whisper for transcription, `text-embedding-3-small` (1536-dim) for embeddings.
- **Sendblue**: iMessage send/receive bridge (third-party, ~$0.015/msg).

---

## 5. The Data Model

`apps/api/app/models.py`. Postgres schema in `apps/api/migrations/versions/`.

### `users`
The unified identity. A user can be reached on any combination of channels.
| col | purpose |
|---|---|
| `id` (uuid pk) | internal |
| `phone` (unique, nullable) | imsg E.164 number |
| `ig_user_id` (unique, nullable) | linked Instagram pk |
| `ig_username` | display |
| `tt_user_id` (unique, nullable) | linked TikTok pk/handle |
| `tt_username` | display |
| `auth_token` (unique) | dashboard auth |
| `timezone` | for digests/reminders |
| `digest_enabled`, `digest_day`, `digest_hour` | weekly digest config |
| `profile` (jsonb) | learned profile: name, location, interests, conversational notes |
| `created_at` | |

A user is "linked" once they have BOTH a phone and at least one external id. Until then, they're channel-only and can't fully use the system.

### `saves`
The core artifact. One row per ingested reel.
| col | purpose |
|---|---|
| `id`, `user_id`, `category_id`, `cluster_id` | identity + grouping |
| `platform` | tiktok / instagram |
| `source_url` | original reel URL |
| `thumbnail_url` | R2 URL |
| `duration_secs` | from yt-dlp |
| `title`, `summary`, `transcript`, `tags[]`, `action_items[]` | LLM-derived |
| `category_confidence` | for fallback to "other" |
| `status` | pending / processing / done / failed |
| `job_id` | RQ job for retry/observability |
| `error_msg` | for failed saves |
| `embedding` (vector(1536)) | semantic search |
| timestamps | |

### `categories`
Fixed seeded list (8): Professional, Things To Do, Places To Eat, Coding Projects, Shopping, Fitness, Recipes, Other.

### `clusters`
Future: dynamic per-user groupings based on embedding clustering.

### `reminders`
| col | purpose |
|---|---|
| `user_id`, `save_id`, `fire_at`, `recur`, `status` | one-shot or recurring reminders, tied to a save |

### `digest_logs`
Per-user weekly digest send log.

### `conversations`
Episodic memory — every imsg/ig/tt turn (user + assistant).
| col | purpose |
|---|---|
| `user_id`, `role`, `content`, `save_id` | turn data |
| `embedding` (vector) | for semantic recall when a query relates to past chats |

### `memories`
Semantic memory — extracted facts, preferences, goals.
| col | purpose |
|---|---|
| `kind` | fact / preference / goal / relationship / project / trait |
| `content`, `importance` (1-10), `embedding` | |
| `source_conversation_id`, `source_save_id`, `metadata` | provenance |
| `last_accessed_at`, `access_count` | for relevance decay |
| `superseded_by` | LLM-driven consolidation; old memories chain to newer ones |

### `pending_links`
Account-linking codes (6-char A-Z0-9, 15-min TTL).
| col | purpose |
|---|---|
| `code` (pk), `platform` (instagram/tiktok), `external_user_id`, `external_username`, `expires_at` | |

### `ig_processed_messages`, `tt_processed_messages`
Dedup tables — message id → processed_at.

---

## 6. The Pipelines

### 6.1 Video Save Pipeline (the core flow)

Triggered when any channel detects a TikTok or Instagram URL.

```
URL detected
  -> create Save row (status=pending)
  -> enqueue RQ job process_video(save_id)
  -> reply via channel: "got it, processing"
  -> RQ worker picks up:
     1. yt-dlp downloads video + extracts audio
     2. Whisper transcribes audio -> transcript
     3. Claude (sonnet) summarizes transcript -> title + summary + tags + action_items
     4. Claude classifies into one of 8 categories (with confidence)
     5. OpenAI embeds (transcript + summary) -> 1536d vector
     6. Generate thumbnail from video, upload to R2
     7. Update Save row: status=done + all extracted fields
     8. Extract memories from this save -> memories table
     9. Send dashboard link back via channel
```

Files: `app/workers/process_video.py`, `app/services/downloader.py`, `app/services/transcriber.py`, `app/services/synthesizer.py`, `app/services/embedder.py`, `app/services/clusterer.py`, `app/services/vision.py`.

### 6.2 Chat Pipeline

Triggered when a non-URL message arrives on any channel. Lives in `app/services/ai_assistant.chat()`.

```
1. Store user turn in conversations table
2. Build context block:
   - User profile (jsonb)
   - Top-N highest-importance memories
   - Recent N conversation turns (raw)
   - If query embeds-similar to past convos/saves -> add those
3. System prompt = SYSTEM_PROMPT + context block
4. Send to Claude haiku-4-5 with tool list:
   - lookup_saves (semantic search user's library)
   - set_reminder (parse natural language time + tie to save)
   - update_profile (write to users.profile jsonb)
   - record_memory (write to memories table)
   - web_search_20250305 (Anthropic server-side, when topic isn't in library)
5. Tool-use loop (max 3 iterations) — Claude calls tools, we respond, repeat
6. Final assistant text -> _sanitize_voice() (strip markdown, caps, em dashes, emojis, orphan punct)
7. Store assistant turn
8. Return string -> channel sends it back
9. Background: extract_memories_from_exchange() runs async to update memory layer
```

Multimodal: if the inbound message has images, they're added as Claude content blocks (vision) so the assistant can see screenshots, photos, etc.

### 6.3 Memory Layer

Triple-decker. Lives in `app/services/memory.py`.

- **Episodic** (`conversations`): every turn, ever. Embedded async. Recalled by cosine similarity when a query semantically matches past chat.
- **Semantic** (`memories`): extracted, deduped facts. After every chat exchange, an LLM extraction pass distills any new durable info ("user is vegetarian", "user's birthday is X", "user is training for marathon"). Consolidation pass merges semantically similar memories (cosine threshold 0.15) and chains old → new via `superseded_by`.
- **Profile** (`users.profile`): top-of-context structured slot for known things (name, location, age, interests). Always injected.

Importance scoring (1-10) drives which memories surface in the prompt context. Access counts decay relevance over time.

### 6.4 Account Linking

A user can text from a phone, DM from an IG account, and DM from a TikTok account, but everything must collapse onto ONE `users` row.

```
1. New IG/TT user DMs the bot
2. Bot creates a User row with the external id only (phone=NULL)
3. Bot calls account_linking.generate_code(platform, external_user_id, username)
   -> 6-char A-Z0-9 code stored in pending_links, 15-min TTL
4. Bot DMs back: "text this code from ur phone to {bot_phone}: ABC123"
5. User texts ABC123 from their phone (imsg)
6. Sendblue webhook hits FastAPI
7. webhook.py detects it's a 6-char code, calls consume_code(code, phone)
8. consume_code:
   a. Find phone-user (or create)
   b. Find external-user by external_user_id
   c. If they're different rows: move all FK rows (saves, conversations, memories, etc) from external-user to phone-user, then delete external-user
   d. Set phone-user.{ig_user_id|tt_user_id} = external_user_id, .ig_username|tt_username
   e. Delete the pending_link row
9. Confirm via imsg AND via the external channel
10. All future messages from that external id route to the unified phone-user
```

Linking is **once per external account**. After that, no friction.

---

## 7. The Channels

### 7.1 iMessage via Sendblue

- **Webhook**: `POST /webhook/sendblue`. Sendblue posts JSON with `number`, `content`, optional `media_url`(s).
- **Send**: `POST https://api.sendblue.co/api/send-message` with `sb-api-key-id` + `sb-api-secret-key` headers, `from_number=+17862139361`.
- **Typing indicator**: `POST /api/send-typing-indicator` (we try `.co` and `.com` hosts as fallback).
- **Read receipt**: `POST /api/mark-read`.
- **Cost**: ~$0.015 per outbound message. Inbound free.
- **HMAC**: Optional via `SENDBLUE_WEBHOOK_SECRET`. Currently disabled (empty) for dev.
- **Why Sendblue and not free alternatives**: BlueBubbles is free but requires a Mac running 24/7. MacInCloud rentals are ~$25-90/mo. For low volume, Sendblue is cheaper and zero-ops.

Files: `app/services/sendblue.py` (async), `app/services/sendblue_sync.py` (sync, for RQ workers), `app/routers/webhook.py`.

### 7.2 Instagram via instagrapi

- **Library**: `instagrapi==2.1.2`. Hits IG's private mobile API. Requires username + password; supports 2FA via verification code on first login.
- **Session reuse**: After first login, `cl.dump_settings(path)` persists cookies to `./ig_sessions/{username}.json`. Subsequent boots restore without re-login.
- **Polling**: every 5s by default (`INSTAGRAM_POLL_SECONDS`). `cl.direct_threads(amount=20, selected_filter="unread")` returns unread threads.
- **Message types parsed**:
  - `text` -> straight text
  - `clip` -> shared reel; reconstruct URL via `clip.code` -> `https://www.instagram.com/reel/{code}/`
  - `media_share` -> shared post; reconstruct as `/p/{code}/`
  - `xma_media_share` -> external reel/video shares; pull `.video_url` or `.target_url`
  - `visual_media` -> images; pull best `image_versions2.candidates[0].url`
- **Sending**: `cl.direct_send(text, thread_ids=[tid])` or `user_ids=[uid]`.
- **Ban risk at 5s polling**: real. ~17k API calls/day. Days-to-weeks lifespan on a burner. Once Meta Business API is approved, we swap to webhooks (zero polling).
- **Outbox**: API server can push outbound messages to redis list `ig:outbox` (json `{ig_user_id, text, thread_id?}`); the bot drains it each loop iteration.

Files: `app/services/instagram.py`, `instagram_bot.py`.

### 7.3 TikTok via Playwright

No instagrapi-equivalent exists for TikTok DMs in 2026 (researched: TikTok-Api scraper has no DM scope, no public messaging API, Business Messaging API is geo-locked + 48hr-window + 10-msg-cap, Data Portability API isn't realtime). The only realistic personal-account path is browser automation.

- **Stack**: `playwright==1.48.0` driving headless Chromium.
- **Persistent profile**: `chromium.launch_persistent_context(user_data_dir="./tt_profile")` keeps cookies, localStorage, login.
- **Auth**: First run needs `TIKTOK_HEADLESS=false` to solve any 2FA/captcha manually. After that, headless works.
- **Selectors** (centralized at top of `app/services/tiktok.py`):
  - inbox items: `[data-e2e="chat-list-item"]`
  - message list: `[data-e2e="message-list"]`
  - chat item: `[data-e2e="chat-item"]`
  - input: `div[contenteditable="true"][role="textbox"]`
  - send: `button[data-e2e="message-send-button"]`, fallback `.StyledSendButton`
  - shared video href: `https://www.tiktok.com/@user/video/\d+`
- **Polling**: every 5s by default. Each cycle: load inbox, identify unread threads, click each, scrape message DOM, extract video links + text + images.
- **Bot detection**: TikTok ships proprietary detection (`__secsdk_csrf_token`, `webmssdk.js`, msToken, X-Gorgon, TLS fingerprinting). playwright-stealth helps but doesn't solve TLS or behavioral profiling. Lifespan: 3-14 days on residential IP, less on datacenter (Railway) IP.
- **Mitigations**: residential proxy via `TIKTOK_PROXY` (~$20/mo from Webshare/BrightData), slower polling (`TIKTOK_POLL_SECONDS=30`), rotate burners weekly.
- **Outbox**: redis list `tt:outbox`.

Files: `app/services/tiktok.py`, `tiktok_bot.py`.

---

## 8. The Dashboard (`apps/web`)

Next.js 14 (App Router) + Tailwind + shadcn-style components. Dark "vault" aesthetic. Deployed to Vercel.

### Use Cases

1. **Visual library**: grid (default) or list view of all saves. Portrait cards w/ thumbnail, platform badge (IG pink, TT black), title, summary, "View" button to original.
2. **Category filtering**: sidebar lists 8 categories with live counts. Click to filter. "All" shows everything.
3. **Search**: top-bar input runs a semantic search via the API (embeds query, cosine-orders saves). Returns top-N matching saves.
4. **Save detail page**: full transcript, summary, action items, tags, reminders attached, source link, originating message context.
5. **Reminders view**: upcoming reminders with quick "snooze" and "complete" actions.
6. **Profile / settings**: edit name, location, timezone, weekly digest preferences.
7. **Memory inspector** (debug-ish): browse what the system "remembers" about you. Useful for trust + correction.
8. **Auth**: per-user `auth_token` (uuid) — initial onboarding sends the user a link to claim their dashboard. Stored in cookie / localStorage.

### Page Map (current + planned)

| route | purpose |
|---|---|
| `/` | feed of saves (grid/list, filter, search) |
| `/save/[id]` | detail page for one save |
| `/reminders` | upcoming + past reminders |
| `/categories` | manage categories (rename, future: add custom) |
| `/profile` | settings |
| `/auth/[token]` | claim dashboard via token sent to imsg |

### Key Files (web)

- `apps/web/lib/api.ts` — typed fetch client. `Save` type includes `transcript: string \| null` after recent build fix.
- `apps/web/components/SaveCard.tsx` — portrait grid card.
- `apps/web/app/page.tsx` — feed w/ grid/list toggle + sidebar.

---

## 9. AI Configuration

Set in `app/services/ai_assistant.py`.

### Models

| usage | model | reason |
|---|---|---|
| chat (default) | `claude-haiku-4-5-20251001` | fast, cheap, great voice fidelity |
| extraction (memory, summary, classification) | `claude-sonnet-4-6` | better at structured output |
| heavy reasoning (rare, optional) | `claude-opus-4-7` | reserve for complex multi-tool reasoning |
| embeddings | OpenAI `text-embedding-3-small` (1536d) | matches pgvector schema |
| transcription | OpenAI Whisper-1 | proven |

### Tool List

Defined in `TOOLS` constant. `CLIENT_TOOLS` set distinguishes which we execute locally vs. server-side.

| tool | side | purpose |
|---|---|---|
| `lookup_saves` | client | semantic search the user's library |
| `set_reminder` | client | natural-language time parsing + reminder row |
| `update_profile` | client | jsonb profile patch |
| `record_memory` | client | manually add a memory |
| `web_search_20250305` | server (Anthropic) | external research when topic isn't in library |

### System Prompt Highlights

- Voice rules (gen-z, lowercase, no emojis, etc)
- "NEVER ASSUME ANYTHING" — read messages literally, ask if ambiguous
- Profile-building instructions (casually ask name/location/etc over time)
- Tool-use guidance (prefer library before web search)
- Image scenario: "u can see images, describe what u see, tie to context, offer to remember if savable"

### Sanitization

`_sanitize_voice()` is a defense-in-depth post-processor:
- strips markdown (bold/italic/code/links/headers/lists)
- strips emojis (full unicode emoji ranges)
- strips em dashes (replaces with comma or space)
- lowercases
- removes lines that are just punctuation
- collapses excess whitespace

This catches voice leaks especially from `web_search` results where Anthropic may inject markdown formatting.

### Error Variety

`_random_error()` returns one of 14 casual replies ("brain crashed lol", "system glitched try again", "lost my train of thought rn", etc). Avoids the "got tangled up" fingerprint.

---

## 10. Configuration / Env

`apps/api/.env` (see `.env.example`):

```bash
# Database (asyncpg + psycopg2 dual URLs — both required)
DATABASE_URL=postgresql+asyncpg://...
DATABASE_SYNC_URL=postgresql+psycopg2://...

# Redis
REDIS_URL=redis://...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=reelvault
R2_PUBLIC_URL=https://pub-...r2.dev

# Sendblue (iMessage)
SENDBLUE_API_KEY=...
SENDBLUE_API_SECRET=...
SENDBLUE_WEBHOOK_SECRET=        # optional HMAC verification
SENDBLUE_FROM_NUMBER=+17862139361

# Instagram bot
INSTAGRAM_USERNAME=
INSTAGRAM_PASSWORD=
INSTAGRAM_VERIFICATION_CODE=    # only on first login
INSTAGRAM_SESSION_DIR=./ig_sessions
INSTAGRAM_POLL_SECONDS=5

# TikTok bot
TIKTOK_USERNAME=
TIKTOK_PASSWORD=
TIKTOK_PROFILE_DIR=./tt_profile
TIKTOK_POLL_SECONDS=5
TIKTOK_HEADLESS=true
TIKTOK_PROXY=                   # optional residential proxy

# App
APP_URL=https://...vercel.app
INTERNAL_CRON_SECRET=...
```

### Connection Pool Tuning

Both async (`database.py`) and sync (`database_sync.py`) engines use:
```python
pool_pre_ping=True        # avoid stale connections (Neon idles them)
pool_recycle=300          # recycle every 5 min
pool_size=5
max_overflow=10
```
Without `pool_pre_ping`, Neon's idle-connection killer caused intermittent "connection is closed" errors.

---

## 11. Deployment Topology

| service | host | start command |
|---|---|---|
| API | Railway | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| RQ worker | Railway | `python worker.py` |
| IG bot | Railway | `python instagram_bot.py` |
| TikTok bot | Railway (with playwright base image) | `python tiktok_bot.py` |
| Postgres | Neon | managed |
| Redis | Upstash | managed |
| R2 | Cloudflare | managed |
| Web dashboard | Vercel | `next start` |
| Sendblue | external SaaS | n/a |

All Railway services share the same `.env` (Neon URL, Redis URL, R2, Anthropic, OpenAI keys). The TikTok bot service needs Chromium installed: use the `mcr.microsoft.com/playwright/python:v1.48.0` base image via Dockerfile rather than nixpacks.

Python 3.11 pinned via `runtime.txt` and `.python-version` (asyncpg 0.29 broke on 3.13; bumped to 0.30 + pinned 3.11 for safety).

---

## 12. The Day-in-the-Life Flow

**User texts a TikTok URL from their phone:**

1. Sendblue webhook hits `POST /webhook/sendblue`
2. FastAPI verifies HMAC (if enabled), parses payload, returns 200 immediately via BackgroundTasks
3. Background task fires `mark_read` + `send_typing_indicator` to Sendblue in parallel
4. `_typing_loop` background task starts, refreshing typing bubble every 4s
5. URL_PATTERN regex detects the TikTok URL → `_handle_save_url`
6. New `Save` row created (status=pending), RQ job enqueued
7. "got it, processing" reply sent via Sendblue (~1s after user texted)
8. Typing bubble disappears
9. RQ worker picks up `process_video(save_id)`:
   - yt-dlp pulls video + audio
   - Whisper transcribes
   - Claude summarizes + categorizes + tags
   - OpenAI embeds
   - Thumbnail to R2
   - Save row updated to status=done
   - Memory extraction runs
10. Worker sends final message: "saved · {title} · {dashboard link}"

**User then asks "what was that ramen spot in nyc i saved":**

1. Webhook → background task → typing bubble
2. URL_PATTERN doesn't match → not a save → goes to `_handle_chat`
3. `ai_assistant.chat()` builds context (profile + top memories + recent turns + semantically-relevant past saves/convos)
4. Claude haiku gets system prompt + context + user message
5. Claude calls `lookup_saves` tool with query "ramen nyc"
6. We embed the query, cosine-search the saves table, return top 3
7. Claude formats reply: "u saved that ichiran spot in midtown last month, here's the link"
8. `_sanitize_voice()` strips any markdown/caps/emojis
9. Reply sent via Sendblue
10. Background memory extraction runs

**User DMs the bot from Instagram:**

1. IG bot's polling loop hits `cl.direct_threads(selected_filter='unread')`
2. New thread detected from `@username`, sender id `12345`
3. Bot calls `get_or_create_external_user("instagram", "12345", "username")` — creates a User row with phone=NULL
4. `is_linked(user, "instagram")` returns False
5. `generate_code("instagram", "12345", "username")` → "X4K9P2"
6. Bot DMs back: "text this code from ur phone to +17862139361: X4K9P2"
7. User texts X4K9P2 from their phone via imsg
8. Sendblue webhook → `_looks_like_link_code` matches → `consume_code("X4K9P2", "+1555...")`
9. Phone user found (or created); external user found by ig_user_id; FK rows migrated; ig fields copied; pending_link deleted
10. Confirm sent via imsg + via IG outbox
11. From now on, IG DMs from `@username` and imsg from that phone both flow to the same User row, same memory, same library.

---

## 13. Open Edges / Future Work

- **Meta Business API approval** → swap IG polling for webhooks (zero polling, real-time, no ban risk).
- **Residential proxy** for TikTok bot to extend session lifespan.
- **Cluster service**: dynamic per-user save groupings via embedding clustering + LLM labels.
- **Reminder UX**: in-dashboard reschedule/snooze beyond the imsg flow.
- **Push notifications**: native mobile app (long-tail).
- **Worker autoscaling**: separate "fast" and "slow" RQ queues so chat replies never wait behind a 90s video transcription.
- **Selector breakage monitoring**: a healthcheck that fails when the IG/TT DOM changes (alerts before the bot silently drops messages).
- **Memory privacy controls**: dashboard view to delete specific memories, archive conversations.
- **Multi-burner failover** for IG/TT: rotate between accounts when one gets rate-limited.

---

## 14. Files Index (apps/api)

```
apps/api/
├── main.py                      # FastAPI app + router includes
├── worker.py                    # RQ SimpleWorker entrypoint
├── instagram_bot.py             # IG long-running listener
├── tiktok_bot.py                # TT long-running listener (playwright)
├── runtime.txt / .python-version # python 3.11 pin
├── requirements.txt
├── alembic.ini
├── migrations/versions/
│   ├── 001_initial_schema.py
│   ├── 002_ai_assistant.py      # users.profile + conversations
│   ├── 003_memory_layer.py      # conversations.embedding + memories
│   ├── 004_instagram.py         # ig fields + pending_links + ig_processed_messages
│   └── 005_tiktok.py            # tt fields + generalized pending_links + tt_processed_messages
├── workers/
│   ├── process_video.py
│   └── send_reminder.py
└── app/
    ├── config.py                # Pydantic settings
    ├── database.py              # async engine
    ├── database_sync.py         # sync engine for RQ + bots
    ├── models.py                # SQLAlchemy models
    ├── routers/
    │   ├── webhook.py           # Sendblue webhook + link-code interception
    │   ├── saves.py
    │   ├── reminders.py
    │   ├── categories.py
    │   ├── digest.py
    │   ├── auth.py
    │   └── internal.py          # cron endpoints
    └── services/
        ├── ai_assistant.py      # chat() core + SYSTEM_PROMPT + tool loop + sanitize_voice
        ├── memory.py            # episodic + semantic memory layer
        ├── bot_parser.py        # legacy intent parser (mostly unused now)
        ├── sendblue.py          # async iMessage sender
        ├── sendblue_sync.py     # sync iMessage sender (for workers)
        ├── instagram.py         # instagrapi adapter
        ├── tiktok.py            # playwright adapter
        ├── account_linking.py   # codes + cross-channel merging
        ├── downloader.py        # yt-dlp wrapper
        ├── transcriber.py       # whisper
        ├── synthesizer.py       # claude summarize/classify
        ├── embedder.py          # openai embeddings
        ├── clusterer.py         # future cluster generation
        ├── digest_service.py    # weekly digest
        └── vision.py            # claude vision wrapper
```

---

## 15. Cost Profile (rough, per 1k saves + ~10k chat messages / mo)

| line | est cost |
|---|---|
| Sendblue (~5k outbound msgs) | $75 |
| Anthropic (haiku chat + sonnet extraction) | $30-60 |
| OpenAI (whisper + embeddings) | $20-40 |
| Neon Postgres | $0-19 |
| Upstash Redis | $0-10 |
| Cloudflare R2 storage + egress | $1-5 |
| Railway (4 services) | $20-40 |
| Vercel (web) | $0-20 |
| Residential proxy (TikTok, optional) | $20 |
| Burner accounts | $0 |
| **Total** | **~$170-290/mo** at this volume |

Drops sharply when Meta Business API replaces IG polling.

---

## 16. Why It's Different

Most "save reels for later" apps stop at "we put your saves in a folder." ReelVault treats saves as the input to a memory system, not the output of a workflow. The dashboard is a search surface for what you've actually thought about. The chat assistant is a friend who's seen your taste evolve. The bots make it work where the user already lives — imsg, IG, TT — without forcing app installs or behavioral change.

The three pillars:
1. **Native channels** — meet the user where they already share content
2. **Real memory** — episodic + semantic + profile, with consolidation, not just chat history
3. **A consistent voice** — gen-z casual, never assumes, never lectures, sanitized end-to-end so it never feels like an LLM

---
