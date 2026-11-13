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
})();
