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
