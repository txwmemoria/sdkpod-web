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

  // Hero terminal: type the command, then print the output line by line.
  const code = document.querySelector(".hero .term code");
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
      .querySelectorAll(".section > .wrap > .section-head, .work, .about > div, .prose > h2, .prose > pre, .prose > .table-scroll")
      .forEach((el) => {
        if (el.getBoundingClientRect().top < innerHeight) return;
        el.classList.add("reveal");
        io.observe(el);
      });
  }
})();
