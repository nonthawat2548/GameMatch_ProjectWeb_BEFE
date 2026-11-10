# GameMatch deployment record — 10 November 2026

Only actual completed results are recorded here; a created resource is not proof of a live deployment.

| Resource | Target / status |
|---|---|
| GitHub | https://github.com/nonthawat2548/GameMatch_ProjectWeb_BEFE — main, user-supplied repository |
| Supabase | gamematch-db, mcwhgbiodyqotfgwzgkd, Singapore, user's organization; created after $0/month confirmation; schema/4 Demo seeds applied; real Go/DB/browser checks passed |
| Render | https://gamematch-api-hzv6.onrender.com — verified Steam release live: dep-dbpd38tg1s2s73c9c2fg, commit 1552b997a1025b42fc4615236dfbc474fefad1c9, free/Singapore, Workspace tea-db866i8m7kps73d7qq60 |
| Vercel | https://gamematch-projectweb-befe.vercel.app — verified Steam release READY: dpl_EYSEJ4FrBXmHC3naKLKN7DbUy4Mr, commit 1552b997a1025b42fc4615236dfbc474fefad1c9; project prj_Z3AR2chEAfNNc10ATA06eQ5kM9uh, Node 22, CRA root frontend |
| RAWG | Optional secondary source; no user key configured. Current public catalog uses real Steam data and images |

Latest catalog update: the user's requested Steam alternative is now implemented and imported 12 real New Releases with Store art, dates, tags and links. The four original Demo rows are hidden, not deleted. RAWG is optional and its missing key does not block Steam. The registered account the user selected has been promoted to Admin and verified; the private email is omitted from this public document. Image QA at desktop/mobile/narrow and real Admin Steam sync evidence is in `evidence/steam-browser/` and `evidence/cloud-browser/`.

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

Render configuration for the repository root (MCP creation does not expose rootDir): runtime Go, `GO_VERSION=1.27.3`, build `cd backend && go build -o server .`, start `cd backend && exec ./server`, free compute, Singapore. DATABASE_URL and JWT_SECRET are server settings. ALLOWED_ORIGINS is set to the verified production domain plus its Vercel team alias. HTTP `/healthz` checks PostgreSQL; TCP health is Render's default because the MCP operation cannot configure healthCheckPath.

Vercel: root directory `frontend`, framework Create React App, Node 22, install `npm ci --legacy-peer-deps`, build `npm run build`, output `build`; REACT_APP_API_URL points to the verified Render URL. `frontend/vercel.json` provides SPA fallback. Authentication protection is disabled only for this new public GameMatch project, allowing Guest access; app Member/Admin JWT guards remain active. No MovieHub project settings changed.

No MovieHub resources or data are used for GameMatch.

## Verified Render release

Service: https://dashboard.render.com/web/srv-dbpcf0om7kps73ahhkt0 . Provider reported `live`; build log confirmed Go 1.27.3 and the intended GitHub main commit. Public `/healthz` returned 200/status ok. Real cloud requests passed Register/Login, guest 401, Member Admin 403, two-member favorite ownership, forbidden CORS origin, logout and old JWT 401. Disposable QA accounts were removed; evidence: `evidence/render-live-api.json`.

The CORS configuration update became live in `dep-dbpchuvg5rvs738he1k0`. The exact public Vercel origin returns 200 with matching Access-Control-Allow-Origin; an unrelated origin returns 403. Credentials stay in the new Render service environment, not this repository. Render uses its default TCP health check; `/healthz` has also been checked directly. Provider error-log scan after the first release returned no error entries.

## Verified complete hosted path

`evidence/cloud-browser/report.json`: five scenario groups passed through the actual deployed Vercel React → Render Go → Supabase DB with no HTTP mocks, at desktop and mobile sizes. Includes UI registration, Quiz score from Go, login return path, favorite persistence/ownership, preferences, current-role Admin add/edit/hide/delete, Profile/Password, rejected old JWT, new-password login and logout. Disposable QA members/game were removed after the run. Four screenshots were retained and reviewed as image files; no user desktop/browser was controlled.

`evidence/production-smoke.json`: HTTP 200/SPA root verified for `/`, `/discover`, `/match`, `/about`, a real game detail path and `/me/profile`; allowed/denied CORS verified. The user's selected registered account has now been promoted to Admin and independently verified. No real RAWG key/import, guaranteed full rubric score, or finished team video is claimed.

## Steam release verification

At source 1552b99, Vercel reported READY and Render reported live. Real Admin UI Steam update completed and persisted 12 records with large Store capsules, source links and release dates. Repeat hosted auth/ownership/profile/Admin flows passed (six groups), with temporary QA accounts/game removed. Public image verification checks all 12 cover downloads at 1366/390/320px and captures updated screenshots. See `evidence/cloud-browser/`, `evidence/steam-browser/` and `evidence/steam-catalog.json`. The four old Demo records remain hidden rather than deleted. This current result supersedes the earlier fixture-only deployment snapshot.
