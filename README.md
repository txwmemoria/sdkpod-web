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
3. For the custom domain, enter `sdkpod.com` under Pages → Custom domain and add the DNS records GitHub shows.

`.nojekyll` tells Pages to serve the files as they are.

### Cloudflare Pages

Connect the repository with **no build command** and output directory `/`, or upload directly:

```bash
npx wrangler pages deploy . --project-name=sdkpod
```

`_headers` sets a few response headers there; GitHub Pages ignores it.
