(() => {
  const nodes = document.querySelectorAll("[data-enter]");
  if (!nodes.length) return;

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    nodes.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
  );

  nodes.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 40, 200)}ms`;
    observer.observe(el);
  });
})();
