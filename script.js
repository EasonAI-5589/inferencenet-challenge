document.documentElement.classList.add('js');

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav-links');
const links = [...nav.querySelectorAll('a')];

function closeMenu({ restoreFocus = false } = {}) {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.querySelector('span').textContent = '+';
  if (restoreFocus) menu.focus();
}
menu.hidden = false;
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
  menu.querySelector('span').textContent = open ? '−' : '+';
});
links.forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu({ restoreFocus: true });
});
window.matchMedia('(min-width: 861px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

const progress = document.querySelector('#reading-progress');
const sections = links.map(link => document.querySelector(link.hash));
let framePending = false;
function updateReadingPosition() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${total > 0 ? Math.min(100, Math.max(0, window.scrollY / total * 100)) : 0}%`;
  let active = null;
  sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) active = section.id; });
  links.forEach(link => {
    if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  framePending = false;
}
function scheduleUpdate() {
  if (!framePending) { framePending = true; requestAnimationFrame(updateReadingPosition); }
}
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate, { passive: true });
updateReadingPosition();

const sampleTabs = document.querySelector('.sample-tabs');
const tabs = [...sampleTabs.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
function selectSample(index, { focus = false } = {}) {
  tabs.forEach((tab, position) => {
    const selected = position === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[position].hidden = !selected;
  });
  if (focus) tabs[index].focus();
  scheduleUpdate();
}
panels.forEach((panel, index) => {
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tabs[index].id);
  panel.tabIndex = 0;
});
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSample(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectSample(next, { focus: true });
  });
});
selectSample(0);
sampleTabs.hidden = false;
