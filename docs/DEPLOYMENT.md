# GameMatch deployment record — 10 November 2026

Only actual completed results are recorded here; a created resource is not proof of a live deployment.

| Resource | Target / status |
|---|---|
| GitHub | https://github.com/nonthawat2548/GameMatch_ProjectWeb_BEFE — main, user-supplied repository |
| Supabase | gamematch-db, mcwhgbiodyqotfgwzgkd, Singapore, user's organization; created after $0/month confirmation; schema/4 Demo seeds applied; real Go/DB/browser checks passed |
| Render | https://gamematch-api-hzv6.onrender.com — live deploy dep-dbpcf1gm7kps73ahhm90, commit 5744c83085a07125b061fa7b42f7c1cb0d2fbd5f, free/Singapore, Workspace tea-db866i8m7kps73d7qq60; real API/DB checks passed |
| Vercel | Intended team nonthawats-projects-c2249e9b; API returned 403 requiring a team consent grant; frontend deployment pending |
| RAWG | No user key configured; real import pending; Demo seed rows are fictional |

Local start from project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
```

In a second terminal:

```powershell
cd frontend
npm start
```

Backend reads a configured DATABASE_URL/JWT_SECRET from the script's explicitly loaded, ignored `backend/.env`. Do not commit that file or copy those values into React. New machines can use `backend/.env.example` plus terminal env. Register the real team account through UI, then promote the intended email through the supplied SQL instruction; there is no default Admin password.

Render configuration for the repository root (MCP creation does not expose rootDir): runtime Go, `GO_VERSION=1.27.3`, build `cd backend && go build -o server .`, start `cd backend && exec ./server`, free compute, Singapore. DATABASE_URL and JWT_SECRET are server settings; ALLOWED_ORIGINS must be replaced with the verified frontend origin. HTTP `/healthz` checks PostgreSQL; TCP health is Render's default if the tool cannot configure a healthCheckPath.

Vercel: root directory `frontend`, framework Create React App, install `npm ci --legacy-peer-deps`, build `npm run build`, output `build`; REACT_APP_API_URL must point to the verified Render URL. `frontend/vercel.json` provides SPA fallback. Verify refresh on `/games/:id` and `/me/profile`, CORS allow/deny, real member/Admin and logout/password flows after publishing.

No MovieHub resources or data are used for GameMatch.

## Verified Render release

Service: https://dashboard.render.com/web/srv-dbpcf0om7kps73ahhkt0 . Provider reported `live`; build log confirmed Go 1.27.3 and the intended GitHub main commit. Public `/healthz` returned 200/status ok. Real cloud requests passed Register/Login, guest 401, Member Admin 403, two-member favorite ownership, forbidden CORS origin, logout and old JWT 401. Disposable QA accounts were removed; evidence: `evidence/render-live-api.json`.

Until the frontend URL is verified, ALLOWED_ORIGINS is the reserved `https://gamematch.invalid`; this deliberately allows no usable browser origin. Replace it with the exact deployed Vercel origin and deploy the environment change before claiming the public frontend works. Credentials stay in the new Render service environment, not this repository. Render uses its default TCP health check because this MCP operation does not expose HTTP healthCheckPath; `/healthz` has also been checked directly.
