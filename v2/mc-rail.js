/* One signature rail for the homepage narrative and Challenge. */
const clamp = x => Math.max(0, Math.min(1, x));
const SIG = [0, -.6, .2, -.9, .1, .7, -.2];
export function createSignatureRail(ol) {
  if (!ol) return () => {};
  const items = [...ol.querySelectorAll('li')], n = items.length, NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'mc-rail-line'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('preserveAspectRatio', 'none');
  ol.prepend(svg);
  const base = document.createElementNS(NS, 'polyline'), ink = document.createElementNS(NS, 'polyline');
  base.setAttribute('class', 'base'); ink.setAttribute('class', 'ink'); svg.append(base, ink);
  const dots = items.map(() => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 4); svg.append(c); return c; });
  let length = 0;
  const layout = () => {
    const w = ol.clientWidth, h = 26; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const pts = items.map((_, i) => [(i + .5) / n * w, h / 2 + SIG[Math.round(i / Math.max(1, n - 1) * 6)] * (h / 2 - 5)]);
    const str = pts.map(p => p.join(',')).join(' ');
    base.setAttribute('points', str); ink.setAttribute('points', str);
    dots.forEach((d, i) => { d.setAttribute('cx', pts[i][0]); d.setAttribute('cy', pts[i][1]); });
    length = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
    ink.style.strokeDasharray = length;
  };
  const observer = new ResizeObserver(() => { layout(); update(currentFraction, currentActive); });
  let currentFraction = 0, currentActive = -1;
  const update = (fraction, active) => {
    currentFraction = fraction; currentActive = active; // fraction 0–1 along the rail, active item index
    ink.style.strokeDashoffset = length * (1 - clamp(fraction));
    items.forEach((li, i) => { li.classList.toggle('on', i === active); li.classList.toggle('done', i < active); dots[i].classList.toggle('on', i <= active); });
  };
  observer.observe(ol); layout();
  update.dispose = () => observer.disconnect();
  return update;
}
