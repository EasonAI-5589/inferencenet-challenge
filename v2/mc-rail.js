/* Segmented glass pill stepper for the homepage narrative and Challenge. */
const clamp = x => Math.max(0, Math.min(1, x));
export function createSignatureRail(ol, { onSelect } = {}) {
  if (!ol) return () => {};
  const items = [...ol.querySelectorAll('li')], n = items.length;
  items.forEach((li, i) => {
    li.addEventListener('click', () => onSelect?.(i));
  });
  let currentFraction = 0, currentActive = -1;
  const update = (fraction, active) => {
    currentFraction = clamp(fraction);
    currentActive = active;
    ol.style.setProperty('--rail-p', currentFraction.toFixed(4));
    items.forEach((li, i) => {
      const isOn = i === active, isDone = i < active;
      li.classList.toggle('on', isOn);
      li.classList.toggle('done', isDone);
      const stepP = active < 0 ? 0 : isDone ? 1 : i > active ? 0 : clamp(currentFraction * n - i);
      li.style.setProperty('--step-p', stepP.toFixed(3));
    });
  };
  update.dispose = () => {};
  return update;
}
