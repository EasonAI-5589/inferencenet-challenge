/* mc-rail.js — the chapter rails of the homepage and the Challenge arena: one bookmark tab
 * per stage, standing on a page edge. Tabs already read stay marked, the current one stands
 * up and fills as its stage is read, the rest wait. Every tab is a button: a click, Enter or
 * Space moves the chapter to that stage, and the arrow keys (Home, End) move between tabs.
 * update(fraction, active) keeps the rail in step with scrolling. */
const clamp = x => Math.max(0, Math.min(1, x));
export function createSignatureRail(ol, { onSelect } = {}) {
  if (!ol) return () => {};
  const items = [...ol.querySelectorAll('li')], n = items.length;
  ol.removeAttribute('aria-hidden');
  ol.classList.add('mc-tabs');
  items.forEach((li, i) => {
    li.setAttribute('role', 'button');
    li.tabIndex = i === 0 ? 0 : -1;
    li.addEventListener('click', () => onSelect?.(i));
    li.addEventListener('keydown', event => {
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[event.key];
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(i); return; }
      if (to === undefined) return;
      event.preventDefault();
      const k = Math.max(0, Math.min(n - 1, to));
      items[k].focus();
      onSelect?.(k);
    });
  });
  let last = -2;
  const update = (fraction, active) => {
    const f = clamp(fraction);
    ol.style.setProperty('--rail-p', f.toFixed(4));
    items.forEach((li, i) => {
      const isOn = i === active, isDone = active >= 0 && i < active;
      const stepP = active < 0 ? 0 : isDone ? 1 : i > active ? 0 : clamp(f * n - i);
      li.style.setProperty('--step-p', stepP.toFixed(3));
      if (active === last) return;
      li.classList.toggle('on', isOn);
      li.classList.toggle('done', isDone);
      if (isOn) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (active === last) return;
    last = active;
    // one tab in the tab order: the current stage (or the first), unless the reader is moving
    // between tabs with the keyboard
    if (!ol.contains(document.activeElement)) items.forEach((li, i) => { li.tabIndex = i === Math.max(0, active) ? 0 : -1; });
  };
  update.dispose = () => {};
  return update;
}
