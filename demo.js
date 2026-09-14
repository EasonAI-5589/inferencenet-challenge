/* Progressive enhancement: without JavaScript, every step remains readable. */
(() => {
  const slides = Array.from(document.querySelectorAll("[data-step]"));
  const links = Array.from(document.querySelectorAll("[data-step-link]"));
  const controls = document.querySelector(".demo-controls");
  const previous = document.getElementById("previous-step");
  const next = document.getElementById("next-step");
  const status = document.getElementById("step-status");
  if (!slides.length || !controls || !previous || !next || !status) return;

  let current = 0;
  const stepFromHash = () => {
    const index = slides.findIndex((slide) => `#${slide.id}` === window.location.hash);
    return index < 0 ? 0 : index;
  };

  function showStep(index, { updateHistory = false, focusHeading = false } = {}) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    links.forEach((link, i) => {
      if (i === current) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    status.textContent = `Step ${current + 1} of ${slides.length}`;
    if (updateHistory && window.location.hash !== `#${slides[current].id}`) {
      window.history.pushState(null, "", `#${slides[current].id}`);
    }
    if (focusHeading) {
      const heading = slides[current].querySelector("h2");
      heading.focus({ preventScroll: true });
      const bounds = heading.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        slides[current].scrollIntoView({ block: "start", behavior: "instant" });
      }
    }
  }

  links.forEach((link) => link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const index = slides.findIndex((slide) => slide.id === link.dataset.stepLink);
    if (index >= 0) showStep(index, { updateHistory: true, focusHeading: true });
  }));
  previous.addEventListener("click", () => showStep(current - 1, { updateHistory: true, focusHeading: true }));
  next.addEventListener("click", () => showStep(current + 1, { updateHistory: true, focusHeading: true }));

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = current + (event.key === "ArrowRight" ? 1 : -1);
    if (index >= 0 && index < slides.length) showStep(index, { updateHistory: true, focusHeading: true });
  });

  window.addEventListener("hashchange", () => showStep(stepFromHash()));
  window.addEventListener("popstate", () => showStep(stepFromHash()));
  showStep(stepFromHash());
  controls.hidden = false;
  document.documentElement.classList.add("demo-enhanced");
})();
