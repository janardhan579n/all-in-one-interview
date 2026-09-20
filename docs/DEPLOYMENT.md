# Testing and sharing the platform

Three stages: prove it works on your machine, put it on your wifi for people in the same
building, then publish it on the open web for free.

---

## 1. Test the whole application

### Automated — about a minute

```bash
cd backend  && mvn test              # 80 tests: algorithms, content store, every endpoint
cd frontend && npm test              # 201 tests: engines, every declared animation, the data layer
cd frontend && npm run validate:content   # every cross-reference in content/ resolves
./tools/verify/run.sh                     # compile + example replay + differential test of all 165 solutions
```

Then, with the backend running, exercise the assembled application over real HTTP:

```bash
cd backend && APP_DATASOURCE_FILE=/tmp/smoke.db mvn spring-boot:run   # terminal 1
./scripts/smoke-api.sh                                                # terminal 2
```

It checks the things unit tests structurally cannot: that quiz answers never leave the server,
that search ranks the lesson above the problem that merely mentions it, that a write is still
there on the next read, and that an exported `progress.json` imports back. It writes real rows,
hence the throwaway database above. Needs `jq` (`brew install jq`).

### Manual — about ten minutes, and worth doing once

Run `./start.sh` and work through this. It is ordered to hit every subsystem.

| # | Do this | You should see |
|---|---|---|
| 1 | Open the dashboard | "Start here", zeroed progress, a daily challenge, connection badge reading **online** |
| 2 | Open **DSA → Sliding Window** | Analogy, motivating problem, brute force, *why it is slow* — and **no** optimised solution yet |
| 3 | Click **"Show me the insight"** | The observation and the leap appear (this is the §42 gate) |
| 4 | Press ▶ on the visualisation | Cells animate, the highlighted Java line moves with them, the variables panel updates, a sentence explains each step |
| 5 | Click the visualisation, press `←` `→` `Space` `R` | Keyboard control works without touching the buttons |
| 6 | Switch **Beginner ⇄ Interview** in the sidebar | Analogies change register across the whole page |
| 7 | Scroll to the quiz, answer one wrong | You get an explanation, not just a red mark |
| 8 | **Mark as complete**, then reload | Still complete — that is the write reaching SQLite |
| 9 | Open **Problems → Two Sum** | Staged reveal: you cannot see the optimal solution at step 1 |
| 10 | Open **System Design → URL Shortener → Architecture evolution** | Stage 1 is one server; stepping to 5 grows the diagram and marks new components |
| 11 | Open the **rate limiter** simulator, send a burst | Real token-bucket arithmetic — some requests 429 |
| 12 | Press `⌘K`, search "sliding window" | The lesson is the first hit, not a problem that mentions windows |
| 13 | **Progress → Export** | A `progress.json` downloads |
| 14 | Stop the backend, reload the page | Badge flips to **offline**, every lesson still opens — this is the fallback working |
| 15 | **Progress → Import** the file you just exported | Your progress reappears, now in browser storage |

Step 14–15 is the one people skip and the one that matters most: the two modes are meant to be
interchangeable, and the export file is the bridge between them.

---

## 2. Share it on your wifi

Anyone on the same network — a laptop across the table, your phone — can use it.

```bash
cd backend  && mvn spring-boot:run         # terminal 1 (optional)
cd frontend && npm run dev -- --host       # terminal 2
```

Vite prints two URLs; give people the **Network** one, e.g. `http://192.168.1.14:5173`.
If you need to find it yourself: `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux.

macOS will ask whether to allow incoming connections the first time — say yes, or nothing
outside your machine can reach it.

**The backend does not need to be exposed.** The dev server proxies `/api` from the server
side, so visitors only ever talk to port 5173 and the backend can stay on localhost. If you
skip the backend entirely, everything still works and each visitor's progress lives in their
own browser.

To test the *production* build over wifi instead of the dev server:

```bash
cd frontend && npm run build && npm run preview -- --host
```

Caveats worth knowing: this is HTTP, not HTTPS, so treat it as a same-room convenience rather
than something to leave running; and everyone sharing one backend shares **one** progress
record, because the app has a single local user by design. For a study group, prefer running
without the backend so each person keeps their own progress.

---

## 3. Host it free on the open web

### Read this first: do not publish the backend as it stands

The backend is built for one person on one laptop. There is no authentication and there is
exactly one user, `local`. Put it on the public internet and every visitor shares the same
progress, the same notes, the same bookmarks — and anyone who finds the URL can write to them.
That is not a bug; it is what "local-first, no mandatory auth" means (§1).

The good news is that you do not need it. The frontend bundles the entire content library and
stores progress in each visitor's own browser, which for a public site is the behaviour you
actually want. **Deploy the frontend as a static site and skip the backend.**

### Build

```bash
cd frontend && npm run build      # → frontend/dist
```

That directory is the whole site: HTML, JS, CSS and the content library. No server, no
database, no runtime cost.

### Redeploying a site that already exists

This is a different flow from creating one, and the trap is worth naming: **`app.netlify.com/drop`
always creates a NEW site.** Dropping a folder there leaves your existing site untouched and gives
you a second, differently-named one. To update the site you already have, go to that site's own
**Deploys** page.

```bash
cd frontend
npm run build          # dist/ is a build artefact — it does not update itself
```

Then open your site in Netlify → **Deploys** tab → drag `frontend/dist` into the drop zone at the
bottom of that page ("Want to deploy a new site without connecting to Git?"). The new build goes
live in seconds and the URL does not change.

If you would rather not drag folders, link the CLI once and it becomes one command:

```bash
npm install -g netlify-cli
cd /path/to/LearnDSA          # the repository root, not frontend/
netlify link                  # pick the existing site from the list
netlify deploy --build --prod
```

Run it from the **repository root**, because that is where `netlify.toml` lives — the CLI reads it
from the current directory, and it is what tells the build to work in `frontend/` and publish
`frontend/dist`. `netlify link` writes `.netlify/state.json`, after which `netlify deploy --build
--prod` is the whole deploy, forever.

To check which kind of site you have: **Site configuration → Build & deploy → Continuous
deployment**. If it names a repository, pushing to that repository is the redeploy and you do not
need any of the above. If it says the site is not linked to a repository, it is a manual deploy and
one of the two routes above is how you update it.

### Netlify — the tested path

Three routes. They produce the same site; pick by whether you want it to redeploy itself.

#### Route A — drag and drop (no account setup, no Git, about a minute)

```bash
cd frontend
npm ci                 # first time only
npm run build          # → frontend/dist
```

Open **[app.netlify.com/drop](https://app.netlify.com/drop)** and drag the whole `frontend/dist`
folder onto the page. You get a URL like `https://spontaneous-kitten-123abc.netlify.app`
immediately. Sign in afterwards to keep it and rename it — an anonymous drop expires.

Rename it under **Site configuration → Change site name** to something you will remember.

#### Route B — the CLI (same thing, repeatable)

```bash
npm install -g netlify-cli
cd frontend
netlify deploy --build --prod
```

The first run asks you to authorise in a browser and to pick or create a site. After that, this
one command is the whole deploy.

#### Route C — connect the repository (redeploys on every push)

Push the repo to GitHub, then in Netlify: **Add new site → Import an existing project**, choose
it, and **accept the defaults** — `netlify.toml` at the repository root already sets everything:

| | |
|---|---|
| Base directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `frontend/dist` |
| Node version | 20, pinned |

Do not retype those into the web form. The file is there so the build on Netlify and the build on
your machine cannot drift apart.

### What you should see when it is live

Open the site and look at the header. The connection badge will read **● offline**.

**That is correct and everything works.** "Offline" means "no backend", which is exactly what a
static deploy is: the whole content library — 33 lessons, 165 problems, 31 concepts, 168 interview
questions — is compiled into the JavaScript bundle at build time, and each visitor's progress,
notes and bookmarks live in their own browser. Nothing is missing; nothing phones home.

Worth clicking once, because these are the things that break on a static host and do not break here:

| Check | Why it matters |
|---|---|
| Open `/dsa/sliding-window` and **hard-refresh** | Proves the SPA fallback works. Without it this is a 404. |
| Press ▶ on a visualisation | Proves the engines run with no server. |
| Open a problem, reveal it, click through to LeetCode | Proves the practice links survived the build. |
| Mark a lesson complete, reload | Proves browser-storage progress works. |

### After you change the content

`dist/` is a build artefact, not a live view of `content/`. A drag-and-drop or CLI deploy ships
whatever you last built, so re-run `npm run build` first. Route C does this for you on every push.

### Free tier, and whether you will hit it

The built site is about **3.4 MB**, most of it the content bundle, which loads lazily after the
first paint. Netlify's free tier gives 100 GB of bandwidth a month — roughly thirty thousand
full loads of this site. For one person revising, and a handful of friends, it is not a
consideration.

### If you want a custom domain

**Domain management → Add a domain**, point your registrar's nameservers at Netlify or add the
CNAME it shows you. HTTPS is provisioned automatically and free; you do not have to do anything
about certificates.

### Do not put the backend behind it

Netlify serves static files. The Spring Boot API would need a separate host, and
[the warning above](#read-this-first-do-not-publish-the-backend-as-it-stands) is the reason not
to: one user, no authentication, by design. Every visitor would share — and be able to overwrite
— the same progress. The static site is not a degraded version of the app; for a public URL it is
the correct one.

### Cloudflare Pages

The same build works unchanged: `frontend/public/_redirects` is already in the repo and Pages
reads it. Drag `frontend/dist` onto [pages.cloudflare.com](https://pages.cloudflare.com), or
connect the repo with build command `cd frontend && npm ci && npm run build` and output
directory `frontend/dist`.

### Vercel

Same idea; `frontend/vercel.json` already contains the SPA rewrite. Set the build command to
`cd frontend && npm ci && npm run build` and the output directory to `frontend/dist`.

### GitHub Pages

Free and tied to the repo, with two wrinkles: the site lives under `/<repo-name>/`, and there
is no redirect rule. Both are handled:

```bash
cd frontend && VITE_BASE=/LearnDSA/ npm run build:pages
```

`VITE_BASE` sets Vite's base path *and* the router's basename, and `build:pages` copies
`index.html` to `404.html`, which is the standard SPA fallback on Pages. Publish `frontend/dist`
to the `gh-pages` branch (or point Pages at it via an Action).

### If you genuinely want the backend online too

Then it needs real accounts first — `user/LocalUserService.java` is the seam, and every table
already carries a `user_id`, so it is a change to that class plus a login screen rather than a
schema migration. Once that exists, the free options are Render, Fly.io or Koyeb; use the
`backend/Dockerfile`, and attach a persistent volume for `/data` or the SQLite file disappears
on every restart. Alternatively run `docker compose up` on a machine you control and reach it
over Tailscale — which keeps it private, which suits what this application is.

---

## Quick reference

| Goal | Command |
|---|---|
| Everything locally | `./start.sh` |
| Frontend only | `./start.sh --frontend` |
| Production build locally | `./start.sh --build` |
| On your wifi | `cd frontend && npm run dev -- --host` |
| Static site for hosting | `cd frontend && npm run build` → `dist/` |
| **Deploy to Netlify** | drag `frontend/dist` to [app.netlify.com/drop](https://app.netlify.com/drop), or `cd frontend && netlify deploy --build --prod` |
| GitHub Pages build | `cd frontend && VITE_BASE=/repo-name/ npm run build:pages` |
| Containers | `docker compose up --build` |
| All tests | `mvn test` · `npm test` · `npm run validate:content` · `./scripts/smoke-api.sh` |
| Verify the solutions | `./tools/verify/run.sh` → `docs/VERIFICATION.md` |
