# References inspected — 10 November 2026

## Course code

- https://github.com/nonthawat2548/moviehub-670710207 — inspected README and `src/api/tmdb.js`: React 19, Router 6, Tailwind 3; a central native fetch helper checks response status and returns JSON.
- https://github.com/nonthawat2548/week6-lab/tree/main/moviehub — inspected `main.go`, `mw/auth.go`, `handler/auth.go` and repository file tree: explicit net/http route handlers, JWT middleware, bcrypt and pgxpool. GameMatch retains this stack. Unlike the reference, GameMatch deliberately checks role/token_version against DB per authenticated request and does not automatically load .env files.
- No course PDF/slides were found among project files. No full equivalence to unseen materials is claimed.

## Visual reference

The user later confirmed the live reference https://moviehub-670710207.vercel.app/ . Read-only HTTP requests returned 200 for its HTML and inspected its published CSS/JS resources. HTML links Prompt via Google Fonts; the deployed navigation uses separate Home/Movies/About paths. GameMatch now follows that route separation and font choice while retaining its own game topic, rule-based Quiz, purple accent and landscape game cards. No browser windows were controlled and no MovieHub resources were changed during this read.

For the user's later redesign request, also inspected MovieHub `src/pages/Home.jsx`, `src/components/Navbar.jsx`, `src/components/MovieCard.jsx`, `src/pages/Movies.jsx`, `src/index.css`, and `src/App.jsx`. Adopted its light surfaces, restrained typography, plain navigation and data-driven genre controls. GameMatch keeps a purple accent and landscape game imagery rather than movie-poster proportions. No course exercise roadmap or TMDB API keys were copied into the product UI.

## RAWG attribution

Read the official API documentation/terms through web search after direct page requests timed out:

- https://rawg.io/apidocs
- https://rawg.io/tos_api
- https://api.rawg.io/docs/

These sources require source attribution and an active RAWG hyperlink on each page using their data/images. Shell already has a shared linked footer; cards now also include per-game source links when rawgId exists, covering Discover, results and Favorites. Detail retains its source link. Demo fixtures remain explicitly fictional. These code checks do not certify image ownership or replace checking the terms applicable to the team's RAWG account before publication. No live RAWG request with a user API key was run.

## Account/resource check

Dependency patch versions were checked against official release pages before updating: https://github.com/remix-run/react-router/releases/tag/react-router%406.30.6 and https://github.com/ajv-validator/ajv/releases/tag/v8.20.0 . These preserve Router major 6 and AJV major 8; latest audit still has outstanding findings.

Connected Supabase project listing returned only `movie-hub-db` (inactive). It was not resumed, modified or reused. No dedicated GameMatch DB, DATABASE_URL, RAWG_API_KEY or remote Git repository was available. The folder was not a Git repository when checked. No external deployment was created or overwritten.
