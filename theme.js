/* Load as a classic head script before stylesheets. Before the page first paints
 * it restores the saved theme (first visits always use light, independent of OS)
 * and settles two things that cannot wait for deferred scripts: whether a Chinese
 * page holds its paint until translated, and whether the homepage plays its
 * entrance. The data-theme it sets also tells site.css that the header controls
 * are coming, so their space is reserved from the first frame. */
(() => {
  const storageKey = "inferencenet-theme";
  const root = document.documentElement;
  let theme = "light";
  try {
    if (window.localStorage.getItem(storageKey) === "dark") theme = "dark";
  } catch { /* Private browsing or storage policy: retain the light default. */ }

  const apply = () => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  };
  apply();

  // A Chinese page is not shown until language.js has translated it, so it never
  // flashes in English first; during a page transition the incoming page fades in
  // already translated. The timer only guards against a failed translation.
  try {
    if (window.localStorage.getItem("inferencenet-language") === "zh") {
      root.classList.add("lang-pending");
      window.setTimeout(() => root.classList.remove("lang-pending"), 1500);
    }
  } catch { /* Without storage the page stays in English. */ }

  // The homepage entrance is a first impression: it plays on arrival from outside
  // the site or on a reload, not when moving between the site's own pages.
  try {
    const entry = performance.getEntriesByType("navigation")[0];
    const within = window.sessionStorage.getItem("inferencenet-visited") && !(entry && entry.type === "reload");
    window.sessionStorage.setItem("inferencenet-visited", "1");
    if (!within) root.classList.add("intro");
  } catch { root.classList.add("intro"); }

  let syncButtons = () => {};
  // A page prerendered in the background (site.js) takes the theme current when it is shown.
  if (document.prerendering) {
    document.addEventListener("prerenderingchange", () => {
      let next = "light";
      try { if (window.localStorage.getItem(storageKey) === "dark") next = "dark"; } catch {}
      if (next !== theme) { theme = next; apply(); syncButtons(); }
    }, { once: true });
  }

  function bindToggle() {
    const buttons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
    syncButtons = () => buttons.forEach((button) => {
      const dark = theme === "dark";
      // Toggle-button pattern: one constant accessible name plus aria-pressed
      // for the state ("Dark theme, toggle button, pressed"). No title: it
      // would only duplicate the name. The visible text still reads the
      // current theme.
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", "Dark theme");
      button.removeAttribute("title");
      const label = button.querySelector("[data-theme-label]");
      if (label) label.textContent = dark ? "Dark" : "Light";
      button.hidden = false;
    });
    buttons.forEach((button) => button.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      const commit = () => { apply(); syncButtons(); };
      // Crossfade the page so the brightness change is eased rather than a flash.
      if (document.startViewTransition) document.startViewTransition(commit);
      else commit();
      try { window.localStorage.setItem(storageKey, theme); }
      catch { /* The control remains usable when persistence is unavailable. */ }
    }));
    syncButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindToggle, { once: true });
  } else bindToggle();
})();
