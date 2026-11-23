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

  // Hero stage: a stone worked in four passes (切 磋 琢 磨), looping. CSS does
  // the drawing; this only steps data-pass on the figure, updates the readouts
  // and pauses when the hero is off-screen or the tab is hidden. The markup
  // already shows the finished pass 4, which reduced-motion visitors keep.
  (() => {
    const stage = document.querySelector(".h-stage");
    if (!stage || calm) return;
    const zh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
    const t = [1, 2, 3, 4].map((n) => stage.querySelector(".t" + n));
    if (t.some((el) => !el)) return;
    const pass = zh ? ["切", "磋", "琢", "磨"] : ["CUT", "FILE", "CARVE", "POLISH"];
    const state = zh ? ["粗胚", "平整", "纹样", "镜面"] : ["ROUGH", "LEVEL", "PATTERNED", "POLISHED"];
    const tol = ["±0.40", "±0.12", "±0.03", "±0.01"];
    const dur = [2800, 2400, 2800, 3300]; // ms per pass; the fade between loops adds 0.8 s
    const FADE = 800, CUT_AT = 1500;
    let cur = 3, bar = -1, t0 = 0, raf = 0, timer = 0, cutTimer = 0;
    let onScreen = true, running = false;

    const readout = (i) => {
      t[0].innerHTML = `PASS 0${i + 1}/04 · <b>${pass[i]}</b>`;
      t[1].innerHTML = `TOL · <b>${tol[i]}</b> mm`;
      t[2].innerHTML = `SURFACE · <b>${state[i]}</b>`;
    };
    const meter = (p) => {
      const q = Math.round(Math.min(p, 1) * 50); // 2% steps
      if (q === bar) return;
      bar = q;
      const on = Math.round(q / 5);
      t[3].textContent = "█".repeat(on) + "░".repeat(10 - on) + " " + String(q * 2).padStart(2, " ") + "%";
    };
    const tick = () => {
      raf = 0;
      if (!running) return;
      meter((performance.now() - t0) / dur[cur]);
      raf = requestAnimationFrame(tick);
    };
    const enter = (i) => {
      cur = i; bar = -1; t0 = performance.now();
      stage.dataset.pass = i + 1;
      stage.classList.remove("cut");
      readout(i);
      meter(0);
      clearTimeout(cutTimer);
      if (i === 0) cutTimer = setTimeout(() => stage.classList.add("cut"), CUT_AT);
      timer = setTimeout(() => {
        if (i < 3) return enter(i + 1);
        meter(1);
        stage.dataset.pass = 0; // fade the stone out, then start over
        timer = setTimeout(() => enter(0), FADE);
      }, dur[i]);
    };
    const run = () => {
      if (running || !onScreen || document.hidden) return;
      running = true;
      if (stage.dataset.pass === "4" && !stage.classList.contains("live")) {
        // first start: snap to the beginning without transitions
        stage.classList.add("live", "boot");
        enter(0);
        void stage.offsetWidth;
        stage.classList.remove("boot");
      } else {
        enter(Math.max(0, (+stage.dataset.pass || 0) - 1));
      }
      raf = requestAnimationFrame(tick);
    };
    const halt = () => {
      running = false;
      clearTimeout(timer); clearTimeout(cutTimer); cancelAnimationFrame(raf);
    };
    const sync = () => (onScreen && !document.hidden ? run() : halt());
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.05 }).observe(stage);
    }
    document.addEventListener("visibilitychange", sync);
    sync();
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
