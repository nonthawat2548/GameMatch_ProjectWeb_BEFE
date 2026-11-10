# GameMatch: instructions for Codex

## Objective and deadline
Complete a Thai university BE–FE term project: GameMatch recommends games by genre, play mode and style. Deadline: 14 November 2026 (Asia/Bangkok). This is a starter implementation, not a certified completed submission. Keep code understandable for a student explaining it in a 15-minute video.

## Mandatory course constraints
- React 19 via Create React App/react-scripts, React Router 6, Tailwind CSS 3, useState/useEffect/Context, native fetch + JSON.
- Go net/http + explicit handlers, JWT, bcrypt, middleware, pgxpool and parameterized PostgreSQL SQL.
- Frontend on Vercel; Backend on Render linked to GitHub; database on Supabase.
- DO NOT migrate to Vite/Next.js/Express/Prisma/Firebase/Supabase Auth or use an AI recommendation service.
- Supabase provides PostgreSQL only. React calls Go; Go connects to DB. Never put DB_URL/JWT_SECRET/RAWG_API_KEY in React.
- Course reference repos (read before changing architecture): https://github.com/nonthawat2548/moviehub-670710207 and https://github.com/nonthawat2548/week6-lab (moviehub subdirectory).
- Do not claim complete equivalence to unseen slides. Inspect the reference repositories and any supplied course PDFs first. Retain the course's simpler implementation patterns.

## First actions
1. Read README.md, docs/HANDOFF.md, docs/API.md, docs/RUBRIC.md and docs/VALIDATION.md.
2. Inspect actual files, run frontend install/test/build and backend tidy/fmt/test/vet/build. Fix errors rather than just planning.
3. Determine whether this folder already has a remote. Do not overwrite an existing MovieHub deployment or data. A mono-repo is supported through FE/BE root directory settings.
4. Configure a new GameMatch DB; run database/schema.sql then optional seed.sql. Go does not auto-load .env files. Use terminal env or Render dashboard.
5. Start locally, verify browser -> Go -> DB -> UI, including persistent reload, wrong role, favorites ownership and RAWG import rollback.
6. Use real RAWG data after a server-side API key is configured; do not invent credentials or live results. Read current RAWG usage terms and add page-level attribution/links as required.
7. Before deploying verify frontend URL, backend URL, database project and environment values. Work autonomously on reversible local changes; request only genuinely missing credentials or decisions.

## Current functionality
- Discover/search/detail; preference form; rules (genre45 + mode25 + style30), top5 deterministic matches and reasons.
- Register/login, JWT checked against current DB role/token_version; logout/password changes invalidate previous sessions.
- Favorites keyed by authenticated member; preferences; profile/password forms.
- Backend-guarded admin CRUD, published visibility flag, RAWG sync of first 40 popular entries with transaction and mutex.
- Fake fixtures named Demo: explicitly; no unverified factual labels or fake current prices.

## Security / scope
Use parameterized SQL; never accept role from signup; keep bcrypt password <=72 bytes; JWT HS256 only with expiry; tokens expire in 2h. RLS blocks direct Data API access, trusted backend DB role handles access. Preserve existing admin descriptions and publication on sync.
JWT localStorage follows the course pattern and is susceptible to XSS; do not add unsafe HTML. All-device logout is intentional, documented behavior. Add tested login throttling before broad production exposure. No payments, chat, reviews, ML, specification matching or automatic scheduling required.
Go files intentionally start small: backend/main.go, handler/api.go, store/store.go, auth/token.go, mw/cors.go and recommend/score.go. Split handler/api.go by feature if it improves teaching clarity, preserving behavior.

## Definition of done
All rubric items in docs/RUBRIC.md verified with actual outputs; React assertions passing; Go tests passing; DB ownership/constraints and 401/403 checks; real deploy URLs working; no secrets committed; setup and limitations documented. Never report passing tests or live deployments that were not run.
