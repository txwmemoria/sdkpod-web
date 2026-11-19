# SDK Pods

Personal app studio site for **sdkpod.com**. Plain HTML, CSS and a few lines of JavaScript — no build step, no dependencies, no web fonts.

```
index.html                    language redirect (saved choice → browser language)
en/index.html                 home (English)
zh/index.html                 home (中文)
en/apps/sync-work/index.html  sw guide (English)
zh/apps/sync-work/index.html  sw guide (中文)
404.html                      self-contained not-found page
assets/css/site.css           all styles, light + dark
assets/js/site.js             theme toggle, copy buttons, language memory
assets/img/mark.svg           logo / favicon
```

All links are relative, so the site works at a domain root or under a sub-path (e.g. `user.github.io/repo/`).

## Preview locally

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Editing

Edit the HTML directly. Each page exists once per language; keep `en/` and `zh/` in step. To add an app, copy `en/apps/sync-work/` and `zh/apps/sync-work/` to a new folder and add a matching `<article class="work">` block to both home pages.

## Deploy

### GitHub Pages

1. Push to GitHub.
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.
3. The `CNAME` file sets the custom domain to `sdkpod.com`. At the DNS provider (DNSPod), point the domain at GitHub:
   - `@` → four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www` → `CNAME` `txwmemoria.github.io`
4. Once GitHub has issued the certificate, tick **Enforce HTTPS** under Settings → Pages.

`.nojekyll` tells Pages to serve the files as they are.

### Cloudflare (Workers static assets)

The site is deployed as a Cloudflare Worker named `sdkpod-web` with static assets only — no build step and no Worker script. `wrangler.toml` points the assets directory at the repo root, and `.assetsignore` keeps `.git`, this README and the config files from being uploaded.

With the GitHub repo connected under Workers & Pages, every push to `main` redeploys. Leave the build command empty; the deploy command is `npx wrangler deploy`. To deploy by hand:

```bash
npx wrangler deploy
```

`_headers` sets a few response headers there; GitHub Pages ignores it.
