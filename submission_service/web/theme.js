(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("inferencenet-theme") === "light") theme = "light";
  } catch {}
  document.documentElement.dataset.theme = theme;
})();
