// SDK Pods — small progressive enhancements. The site works without this file.
(() => {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // Theme toggle: follows the OS until the visitor picks one.
  const toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current =
        root.dataset.theme ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      store.set("theme", next);
    });
  }

  // Remember the chosen language so the root page redirects there next time.
  document.querySelectorAll("[data-lang-switch]").forEach((a) => {
    a.addEventListener("click", () => store.set("lang", a.dataset.langSwitch));
  });

  // Copy buttons for one-line commands.
  document.querySelectorAll(".cmd button").forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener("click", async () => {
      const code = btn.parentElement.querySelector("code");
      if (!code || !navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(code.textContent.trim());
        btn.textContent = btn.dataset.done || "✓";
        setTimeout(() => { btn.textContent = label; }, 1400);
      } catch { /* clipboard denied */ }
    });
  });

  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Jade disc: the rings of small raised grains (谷纹) are drawn here rather
  // than shipped as hundreds of circles in the HTML. Without JS it is a plain disc.
  document.querySelectorAll("svg .grains").forEach((g) => {
    const ns = "http://www.w3.org/2000/svg";
    const cx = +g.dataset.cx, cy = +g.dataset.cy, r0 = +g.dataset.r0, r1 = +g.dataset.r1;
    const step = +g.dataset.step || 12.5;
    for (let r = r0, ring = 0; r <= r1; r += step, ring++) {
      const n = Math.round((2 * Math.PI * r) / step);
      for (let i = 0; i < n; i++) {
        const a = ((i + (ring % 2) * 0.5) / n) * 2 * Math.PI;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const shade = document.createElementNS(ns, "circle");
        shade.setAttribute("cx", (x + 0.9).toFixed(1));
        shade.setAttribute("cy", (y + 1.1).toFixed(1));
        shade.setAttribute("r", (step * 0.36).toFixed(1));
        shade.setAttribute("fill", "rgba(12,48,34,.28)");
        const bump = document.createElementNS(ns, "circle");
        bump.setAttribute("cx", x.toFixed(1));
        bump.setAttribute("cy", y.toFixed(1));
        bump.setAttribute("r", (step * 0.34).toFixed(1));
        // a lit bead when the page defines one, a flat dot otherwise
        bump.setAttribute("fill", document.getElementById("bumpG") ? "url(#bumpG)" : "rgba(255,255,255,.3)");
        g.append(shade, bump);
      }
    }
  });

  // Jade disc, step two: the static layers (body, turbulence texture, grains,
  // rims, highlights) are rasterised once into a single <image>, so the sway
  // animation only moves a bitmap. Any failure leaves the vector disc as is.
  (() => {
    try {
      const bi = document.querySelector(".h-stage g.bi");
      const svg = bi && bi.ownerSVGElement;
      const sheen = bi && bi.querySelector(".sheen");
      const body = bi && bi.querySelector('path[fill="url(#jd-body)"]');
      if (!svg || !sheen || !body || !bi.querySelector(".grains > circle")) return;
      const layers = [];
      for (let n = body; n && n !== sheen; n = n.nextElementSibling) layers.push(n);
      // highlight arcs sit after the sheen, before the clipped scan group
      for (let n = sheen.nextElementSibling; n && n.tagName.toLowerCase() === "path"; n = n.nextElementSibling) layers.push(n);
      const defs = svg.querySelector("defs");
      const X = 30, Y = 90, W = 400, H = 400;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ser = new XMLSerializer();
      const src =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${X} ${Y} ${W} ${H}" width="${W * dpr}" height="${H * dpr}">` +
        ser.serializeToString(defs) + layers.map((n) => ser.serializeToString(n)).join("") + "</svg>";
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = W * dpr; c.height = H * dpr;
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const url = c.toDataURL("image/png");
          const el = document.createElementNS("http://www.w3.org/2000/svg", "image");
          el.setAttribute("href", url);
          el.setAttribute("x", X); el.setAttribute("y", Y);
          el.setAttribute("width", W); el.setAttribute("height", H);
          bi.insertBefore(el, layers[0]);
          layers.forEach((n) => n.remove());
        } catch (e) { /* keep the vector disc */ }
      };
      img.onerror = () => {};
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
    } catch (e) { /* keep the vector disc */ }
  })();

  // Recent updates: refresh the hand-written log from GitHub Releases.
  const log = document.querySelector("ul.h-log[data-auto]");
  if (log) {
    const zh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
    const repos = [
      ["txwmemoria/lingo-dict", "LingoDict", "apps/lingo-dict/#download"],
      ["txwmemoria/sync-work", "sw", "apps/sync-work/"],
    ];
    const KEY = "sdk.releases", TTL = 6 * 3600 * 1000;
    const load = async () => {
      try {
        const c = JSON.parse(localStorage.getItem(KEY) || "null");
        if (c && Date.now() - c.t < TTL && Array.isArray(c.items)) return c.items;
      } catch (e) {}
      const items = [];
      let ok = false;
      await Promise.all(repos.map(async ([repo, name, href]) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, { headers: { Accept: "application/vnd.github+json" } });
          if (!res.ok) return;
          const list = await res.json();
          ok = true;
          list.forEach((r) => {
            if (r.draft || r.prerelease || !/^v/.test(r.tag_name || "")) return;
            const ver = r.tag_name.slice(1);
            const t = (r.name || "").trim();
            const bare = t.replace(new RegExp("^" + name + "\\s*", "i"), "").replace(/^v/i, "").trim();
            const title = t && bare !== ver ? t : "";
            items.push({ date: (r.published_at || r.created_at || "").slice(0, 10), name, ver, href, title });
          });
        } catch (e) {}
      }));
      if (ok) { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), items })); } catch (e) {} }
      return items;
    };
    load().then((items) => {
      if (!items.length) return;
      const key = (n, v) => (n + " " + v).toLowerCase();
      // 每个产品只列最新的一版，免得同一个产品的历史版本把别的更新挤出去
      const latest = new Map();
      items.forEach((i) => {
        const cur = latest.get(i.name);
        if (!cur || i.date > cur.date) latest.set(i.name, i);
      });
      // 手写的条目：同一版本就沿用手写的说明（比默认文案具体），旧版本丢掉，其余（比如小游戏的更新）照留
      const written = new Map();
      const others = [];
      [...log.children].forEach((li) => {
        const what = ((li.querySelector(".what") || {}).textContent || "").trim();
        const a = li.querySelector("p a");
        const row = { date: (li.querySelector("time") || {}).textContent || "", what, href: a && a.getAttribute("href"), text: a ? a.textContent : "" };
        if (/^(LingoDict|sw)\s+\d/i.test(what)) written.set(what.toLowerCase(), row);
        else others.push(row);
      });
      const rows = [...latest.values()].map((i) => {
        const hand = written.get(key(i.name, i.ver));
        return {
          date: i.date, what: `${i.name} ${i.ver}`, href: i.href,
          text: (hand && hand.text) || i.title || (zh ? "发布新版本，安装包可在介绍页下载。" : "New release; installers are on the guide page."),
        };
      }).concat(others);
      rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      const frag = document.createDocumentFragment();
      rows.slice(0, 5).forEach((r) => {
        const li = document.createElement("li");
        const tm = document.createElement("time"); tm.textContent = r.date;
        const w = document.createElement("span"); w.className = "what"; w.textContent = r.what;
        const p = document.createElement("p"), a = document.createElement("a");
        a.href = r.href || "#"; a.textContent = r.text; p.append(a);
        li.append(tm, w, p);
        frag.append(li);
      });
      log.replaceChildren(frag);
    });
  }

  // Hero terminal: type the command, then print the output line by line.
  const code = document.querySelector(".hero .term code, [data-typing] code");
  if (code && !calm) {
    code.innerHTML = code.innerHTML
      .split("\n")
      .map((line) => `<span class="tl">${line}</span>`)
      .join("\n");
    code.classList.add("typing");

    const lines = [...code.querySelectorAll(".tl")];
    const caret = document.createElement("span");
    caret.className = "caret";
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      const first = lines[0];
      const cmd = first.lastChild; // text node: " sw verify"
      const text = cmd.textContent;
      cmd.textContent = " ";
      first.append(caret);
      first.classList.add("on");
      await wait(900);
      for (const ch of text.slice(1)) {
        cmd.textContent += ch;
        await wait(55 + Math.random() * 60);
      }
      const pauses = [450, 180, 320, 260, 650, 750, 380];
      for (let i = 1; i < lines.length; i++) {
        await wait(pauses[i - 1] || 250);
        lines[i].classList.add("on");
        lines[i].append(caret);
      }
    })();
  }

  // Scroll reveal: only blocks that start below the fold are hidden, so
  // nothing visible on load ever flashes.
  if (!calm && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    document
      .querySelectorAll(".section > .wrap > .section-head, .work, .about > div, .prose > h2, .prose > pre, .prose > .table-scroll, .h-head, .h-work, .h-habit, .h-log li")
      .forEach((el) => {
        if (el.getBoundingClientRect().top < innerHeight) return;
        el.classList.add("reveal");
        io.observe(el);
      });
  }
})();
