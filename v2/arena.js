/* A single scroll-owned timeline: camera, equipment, rooms and evidence all follow it. */
import { createSignatureRail } from './mc-rail.js';
import { ARENA_DOMAINS, HARNESS_NAMES } from './arena-data.js';

const chapter = document.querySelector('.mc-chapter');
if (chapter) {
  const $ = selector => chapter.querySelector(selector);
  const $$ = selector => [...chapter.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 860px) and (max-height: 720px)');
  const manual = () => reduced.matches || compact.matches;
  const stops = [0, .16, .38, .57, .76, .93, 1];
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
  const lang = () => document.documentElement.lang.startsWith('zh') ? 1 : 0;
  const state = { progress: 0, arrival: manual() ? 1 : 0, phase: 0, harness: 0, equippedHarness: null, room: 0, pointer: { x: 0, y: 0 }, paused: reduced.matches, language: lang() ? 'zh' : 'en' };
  const harnesses = [
    { name: 'DeepSeek Harness', lines: ['DeepSeek', 'Harness'], type: ['Plugin runtime', '插件运行时'], description: ['Swap the runtime. Recompose the tools, context and feedback around the same agent.', '切换运行时，围绕同一个 Agent 重新组织工具、上下文与反馈。'] },
    { name: 'DeepAgents', lines: ['DeepAgents'], type: ['Library harness', '库式 Harness'], description: ['Equip a planning-oriented harness. Make the workflow and working context part of the setup.', '装备面向规划的 Harness，将工作流与工作上下文纳入配置。'] },
    { name: 'Claude Code', lines: ['Claude', 'Code'], type: ['CLI harness', '命令行 Harness'], description: ['Load a different execution loop. The challenge still begins with the same evidence.', '装载不同的执行循环，挑战仍从同一份证据出发。'] },
    { name: 'Codex CLI', lines: ['Codex', 'CLI'], type: ['CLI harness', '命令行 Harness'], description: ['Exchange the tool interface and execution environment around the model.', '更换模型周围的工具接口与执行环境。'] },
    { name: 'OpenCode', lines: ['OpenCode'], type: ['Server runtime', '服务式运行时'], description: ['Another equipment slot, another way to organize the agent’s work.', '另一套装备，用另一种方式组织 Agent 的工作。'] },
    { name: 'OpenHands SDK', lines: ['OpenHands', 'SDK'], type: ['Agent runtime', 'Agent 运行时'], description: ['Connect the agent, conversation and workspace through a different runtime.', '通过不同的运行时连接 Agent、会话与工作空间。'] },
    { name: 'Terminus-2', lines: ['Terminus', '-2'], type: ['Reference loop', '参考执行循环'], description: ['Equip a terminal-oriented loop. Tools turn proposed actions into observable results.', '装备面向终端的执行循环，让工具将行动转化为可观察结果。'] },
    { name: 'mini-SWE-agent', lines: ['mini-SWE', 'agent'], type: ['Minimal loop', '精简执行循环'], description: ['Strip the loop back to its essentials. Architecture is a variable; evidence remains the anchor.', '将循环简化到核心。架构可以改变，证据始终是依据。'] },
  ];
  // Each room is a portal to its track on the Challenge page.
  const TRACKS = { econ: 'challenge.html#subtrack-econometric', fin: 'challenge.html#demo-finance-title', soc: 'challenge.html#demo-hr-title' };
  const domainHeadlines = [
    ['Evidence to insight.', '从证据理解经济。'],
    ['Make it add up.', '让每一项都有依据。'],
    ['People & decisions.', '理解人与决策。'],
  ];
  const domainEvents = [
    ['Reproduce findings → interpret policy → calibrate signals → align data.', '复现实证结果 → 解读政策 → 校准市场信号 → 对齐数据口径。'],
    ['Reconcile accounts → trace disclosures → assess risk → explain the numbers.', '核对账目 → 追踪披露 → 识别风险 → 解释数值与文本。'],
    ['Interpret rules → understand organizations → analyze behavior → support decisions.', '理解规则 → 分析组织 → 研究行为 → 支持决策。'],
  ];
  const phases = [
    { tag:['01 / THE ENTRANCE','01 / 挑战赛入口'], title:['Three portals.<br><em>Three tracks.</em>','三扇门，<br><em>三条赛道。</em>'], body:['Economics, Finance and Social Science. Step through a portal to reach its track: the tasks, the data and how runs are scored.', '经济、金融与社科。穿过一扇门，就进入对应的赛道：题目、数据和评分方式都在那里。'], code:['THREE TRACKS · SIXTEEN CASE CATEGORIES','三条赛道 · 16 个二级目录'], label:['ENTER','入口'], event:['Pick a portal, or scroll to walk through all three with one agent.', '选一扇门直接进入，或继续滚动，跟着一个 Agent 走过三条赛道。'] },
    { tag:['02 / THE HARNESS WHEEL','02 / HARNESS 装备轮'], title:['Same mind.<br><em>Different tools.</em>','同一个 Agent，<br><em>不同的装备。</em>'], body:['Scroll to browse eight harnesses. Confirm one, then watch it unfold beside your agent as you approach a challenge.', '滚动浏览八种 Harness。确认装备后，继续靠近房间，武器会从背部展开至身侧并瞄准挑战。'], code:['SCROLL TO BROWSE · CLICK TO EQUIP','滚动浏览 · 点击装备'], label:['EQUIP','装备'], event:['', ''] },
    ...ARENA_DOMAINS.map((domain, i) => ({
      tag: [`0${i + 3} / ${domain.id.toUpperCase()}`, `0${i + 3} / ${domain.name[1]}`],
      title: [`${domain.name[0]}<br><em>${domainHeadlines[i][0]}</em>`, `${domain.name[1]}<br><em>${domainHeadlines[i][1]}</em>`],
      body: domain.summary,
      code: [`${domain.id}/ · ${domain.entries.length} CASE CATEGORIES`, `${domain.id}/ · ${domain.entries.length} 个二级目录`],
      label: [domain.name[0].toUpperCase(), domain.name[1]], event: domainEvents[i],
    })),
    { tag:['06 / CHOOSE YOUR TRACK','06 / 选择赛道'], title:['Step through.<br><em>Pick your track.</em>','选一扇门，<br><em>进入你的赛道。</em>'], body:['All three portals are open. Every track runs the same loop: raw evidence in, a deliverable out, the whole trajectory kept.', '三扇门都已打开。每条赛道都是同一个闭环：输入原始证据，交出可核查的成果，完整保留执行轨迹。'], code:['THREE PORTALS · ONE CHALLENGE','三扇门 · 一个挑战赛'], label:['CHOOSE','选择赛道'], event:['Click a portal to enter its track.', '点击任意一扇门，进入对应赛道。'] },
  ];
  const toolPaths = [
    'M-34-6h15l6-7H12v6h27v8H8L-2 13h-12l3-12h-23Z M-7-6H8 M24-3h17',
    'M-34-8h13v-5h30v5h25v10H5l-9 13h-12l4-13h-22Z M-9-9v8 M0-9v8 M9-9v8 M25-10v15',
    'M-33-7h22l5-7h17l7 7h19V3H8L0 14h-13l4-12h-24Z M-5-7l6 4-6 4 M10 1h9',
    'M-33-9h51v5h20v8H9l-8 11h-13l4-12h-25Z M-3-11v-5H9v5 M24-8v15 M-21-4h9',
    'M-32-6h19l6-7h23v6h21v11H8L0 14h-12l3-12h-23Z M-3-7l-5 4 5 4 M8-7l5 4-5 4',
    'M-32-8h14l8-6H7l9 7h22V4H8L0 14h-12l4-11h-24Z M-4-9V0 M3-9V0 M24-12v20 M30-9v14',
    'M-37-6h28l6-7h20v6h25v8H5L-2 14h-12l5-12h-28Z M-2-7l6 4-6 4 M10 1h10 M28-3h16',
    'M-27-8h45v5h17v7H4L-3 14h-12l6-11h-18Z M-16-4h21 M-8-14H8 M-1-14v6',
  ];
  const polar = (r, a) => [300 + Math.cos(a) * r, 300 + Math.sin(a) * r];
  const pt = p => p.map(x => x.toFixed(2)).join(' ');
  const wedge = (a, b) => `M${pt(polar(272,a))} A272 272 0 0 1 ${pt(polar(272,b))} L${pt(polar(175,b))} A175 175 0 0 0 ${pt(polar(175,a))}Z`;
  const wheel = $('.mc-wheel svg');
  wheel.innerHTML = `<circle class="mc-wheel-centerline" cx="300" cy="300" r="157"/><circle class="mc-wheel-ruler" cx="300" cy="300" r="283" stroke-width="1"/>`
    + harnesses.map((h, i) => {
      const mid = -Math.PI / 2 + i * Math.PI / 4, a = mid - Math.PI / 8 + .017, b = mid + Math.PI / 8 - .017;
      const c = polar(225,mid);
      return `<g data-wheel-item="${i}"><path class="mc-sector" d="${wedge(a,b)}"/><path class="mc-sector-inner" d="M${pt(polar(181,a+.012))} A181 181 0 0 1 ${pt(polar(181,b-.012))}"/><g class="mc-item-icon" transform="translate(${c[0]},${c[1]-23}) scale(.73)"><path d="${toolPaths[i]}" fill="currentColor" fill-opacity=".13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></g><text class="mc-item-name" x="${c[0]}" y="${c[1]+10}">${h.lines.map((line,j)=>`<tspan x="${c[0]}" dy="${j ? 24 : 0}">${line}</tspan>`).join('')}</text></g>`;
    }).join('')
    + Array.from({length:80},(_,i)=>{ const a=i*Math.PI/40;return `<path class="mc-wheel-ruler" d="M${pt(polar(287,a))}L${pt(polar(i%10===0?296:291,a))}"/>`; }).join('');
  const setRail = createSignatureRail($('.mc-timeline'));
  let scene, loading = false, frame = 0, visible = false, anchor = null, lastKey = '';
  function paintCopy() {
    const l = lang(), p = phases[state.phase], h = harnesses[state.harness];
    const equipped = harnesses[state.equippedHarness], browsing = state.phase === 1;
    const shown = browsing ? h : equipped;
    const inDomain = state.phase >= 2 && state.phase <= 4;
    const domain = ARENA_DOMAINS[state.room];
    chapter.dataset.domain = inDomain ? domain.id : '';
    chapter.style.setProperty('--domain-accent', ['var(--track-1)', 'var(--track-2)', 'var(--mc-violet)'][state.room]);
    $('[data-mc-directory]').hidden = !inDomain;
    const enter = $('[data-mc-enter]');
    enter.hidden = !inDomain;
    enter.href = TRACKS[domain.id];
    enter.textContent = l ? `进入${domain.name[1]}赛道 →` : `Enter the ${domain.name[0]} track →`;
    $$('[data-portal]').forEach(link => {
      const d = ARENA_DOMAINS.find(x => x.id === link.dataset.portal), i = ARENA_DOMAINS.indexOf(d);
      link.href = TRACKS[d.id];
      link.querySelector('small').textContent = l ? `传送门 ${i + 1} · ${d.name[1]}` : `Portal ${i + 1} · ${d.name[0]}`;
      link.querySelector('b').textContent = l ? `进入${d.name[1]}赛道` : `Enter the ${d.name[0]} track`;
      link.querySelector('em').textContent = d.name[l];
      link.setAttribute('aria-label', l ? `进入${d.name[1]}赛道` : `Enter the ${d.name[0]} track`);
    });
    $('.mc-portals').setAttribute('aria-label', l ? '进入赛道' : 'Enter a track');
    $('[data-mc-directory]').setAttribute('aria-label', domain.name[l] + (l ? ' 目录' : ' case categories'));
    $('[data-mc-directory-hint]').textContent = l ? '横滑查看 →' : 'SWIPE →';
    $('[data-mc-overview]').hidden = state.phase !== 0;
    $('[data-mc-directory-title]').textContent = l ? `${domain.id}/ · ${domain.entries.length} 个二级目录` : `${domain.id}/ · ${domain.entries.length} case categories`;
    $('[data-mc-directory-list]').replaceChildren(...domain.entries.map(entry => {
      const item = document.createElement('li'), code = document.createElement('code'), name = document.createElement('span');
      item.dataset.category = entry.id; item.title = entry.description[l];
      code.textContent = entry.id; name.textContent = entry.name[l];
      item.append(code, name); return item;
    }));
    $('[data-mc-overview]').replaceChildren(...ARENA_DOMAINS.map(d => {
      const tag = document.createElement('span'); tag.textContent = `${d.id}/ ${d.entries.length}`;
      tag.title = `${d.name[l]} · ${d.entries.length}`; return tag;
    }));
    $('[data-mc-kicker]').textContent = p.tag[l];
    $('#system-title').innerHTML = p.title[l];
    $('[data-mc-body]').textContent = browsing && manual()
      ? (l ? '用进度条浏览八种 Harness，再点击区段或确认按钮装备。' : 'Use the slider to browse eight harnesses, then click a slot or confirm your equipment.')
      : p.body[l];
    $('[data-mc-code]').textContent = p.code[l];
    $('[data-mc-equipped]').textContent = shown?.name || (l ? '等待选择装备' : 'Awaiting a loadout');
    $('[data-mc-equipped]').dataset.font = shown ? harnesses.indexOf(shown) : '';
    $('[data-mc-type]').textContent = shown?.type[l] || (l ? '在装备轮中确认你的 Harness' : 'Choose a harness at the equipment wheel');
    $('.mc-confirm').hidden = !browsing;
    $('.mc-confirm').disabled = state.equippedHarness === state.harness;
    $('.mc-confirm').textContent = state.equippedHarness === state.harness ? (l ? '已装备 ✓' : 'Equipped ✓') : (l ? '确认装备 ↗' : 'Equip this harness ↗');
    $('.mc-confirm').setAttribute('aria-label', l ? `确认装备 ${h.name}` : `Equip ${h.name}`);
    $('[data-mc-carried]').textContent = equipped ? (l ? `背负装备：${equipped.name}` : `ON YOUR BACK / ${equipped.name}`) : (l ? '尚未装备 · 点击确认' : 'NOT EQUIPPED · CLICK TO CONFIRM');
    $('[data-mc-carried]').hidden = !browsing;
    $('[data-mc-event]').textContent = state.phase === 1 ? h.description[l] : p.event[l];
    $('[data-mc-index]').textContent = String(state.phase + 1).padStart(2,'0');
    $('[data-mc-name]').textContent = l ? 'METACASE 挑战赛' : 'THE METACASE CHALLENGE';
    $('[data-mc-scroll-hint]').textContent = manual() ? (l?'用下方进度条探索':'EXPLORE WITH THE SLIDER') : (l?'滚动，进入下一幕':'SCROLL TO EXPLORE');
    $('[data-mc-loadout-label]').textContent = browsing ? (l ? '预览装备 / HARNESS' : 'PREVIEW / HARNESS') : inDomain && equipped ? (l ? '悬浮装备 / HARNESS' : 'DEPLOYED / HARNESS') : (l ? '背负装备 / HARNESS' : 'CARRIED / HARNESS');
    $('[data-mc-wheel-label]').textContent = manual()
      ? (l ? '拖动进度条浏览 · 点击区段确认' : 'USE THE SLIDER · CLICK A SLOT TO EQUIP')
      : (l ? '滚动浏览 · 点击区段确认' : 'SCROLL TO BROWSE · CLICK A SLOT TO EQUIP');
    $('[data-mc-episode-label]').textContent = l ? 'METACASE / 轨迹' : 'METACASE / TRACE';
    $('[data-mc-illustrative]').textContent = l ? '经济 · 金融 · 社科 / 三大方向，16 个二级目录。' : 'Economics · Finance · Social Science / 3 domains, 16 case categories.';
    $('[data-mc-slider-label]').textContent = l ? '探索完整解题轨迹' : 'Explore the complete episode';
    $('.mc-timeline').setAttribute('aria-label', l ? '解题轨迹章节' : 'Episode chapters');
    $('.mc-fallback p').textContent = l ? '一个 Agent，多种 Harness。从原始证据走向可复用经验。滚动或使用进度条探索。' : 'One agent. Many harnesses. Follow the path from evidence to experience by scrolling or using the slider.';
    $('.mc-scrub').setAttribute('aria-valuetext', `${p.label[l]} · ${Math.round(state.progress*100)}%`);
    $('.mc-wheel').setAttribute('aria-label', l ? 'Harness 装备轮，滚动浏览，点击或按回车确认' : 'Harness wheel. Scroll to browse; click or press Enter to equip.');
    $('.mc-wheel').inert = !browsing;
    $('.mc-wheel').setAttribute('aria-hidden', String(!browsing));
    $$('[data-wheel-item]').forEach((e,i)=>{
      e.classList.toggle('is-active',i===state.harness);
      e.classList.toggle('is-equipped',i===state.equippedHarness);
      e.setAttribute('role','button');
      e.setAttribute('tabindex',browsing ? '0' : '-1');
      e.setAttribute('aria-pressed',String(i===state.equippedHarness));
      e.setAttribute('aria-label',l ? `装备 ${harnesses[i].name}` : `Equip ${harnesses[i].name}`);
    });
    $$('[data-mc-chapter]').forEach((e,i)=>{ e.classList.toggle('is-active',i===state.phase); e.querySelector('span').textContent=phases[i].label[l]; });
    chapter.dataset.phase = state.phase;
    chapter.dataset.harness = state.harness;
    chapter.dataset.equippedHarness = state.equippedHarness ?? '';
    chapter.dataset.room = state.room;
  }
  function setProgress(value) {
    state.progress = clamp(value);
    state.phase = Math.min(5, stops.findIndex((end,i)=>i>0 && state.progress<end)-1);
    if(state.phase<0) state.phase=5;
    const local = clamp((state.progress-stops[state.phase])/(stops[state.phase+1]-stops[state.phase]));
    state.room = state.phase < 3 ? 0 : state.phase === 3 ? 1 : 2;
    if (state.phase === 1) state.harness = Math.min(7,Math.floor(local*8));
    const key = `${state.phase}:${state.harness}:${state.equippedHarness}:${lang()}`;
    if (lastKey !== key) { lastKey = key; paintCopy(); }
    const enter = ease((state.progress-.12)/.055), exit = ease((state.progress-.365)/.035);
    $('.mc-wheel').style.setProperty('--wheel-opacity',(enter*(1-exit)).toFixed(3));
    $('.mc-wheel').style.setProperty('--wheel-scale',(.75+.25*enter-.14*exit).toFixed(3));
    setRail(clamp((state.phase + local) / 5), state.phase);
    $('.mc-scrub').value = Math.round(state.progress*1000);
    chapter.dataset.progress = state.progress.toFixed(4);
    scene?.update(state);
  }
  function fromScroll() {
    frame = 0;
    if (manual()) {
      state.arrival = 1;
      scene?.update(state);
      return;
    }
    const rect = chapter.getBoundingClientRect(), pin = $('.mc-pin');
    const top = parseFloat(getComputedStyle(pin).top) || 112;
    const range = chapter.offsetHeight-pin.offsetHeight;
    // The descent starts as this chapter enters the viewport, before its pinned timeline.
    // Both arrival and the episode are spatial, so reversing the scroll reverses the flight.
    state.arrival = clamp((innerHeight-rect.top)/Math.max(1,innerHeight-top));
    if (range>0) setProgress((top-rect.top)/range);
  }
  const schedule = () => { if (!frame && visible) frame=requestAnimationFrame(fromScroll); };
  function equip(index) {
    if (state.phase !== 1) return;
    state.harness = index;
    state.equippedHarness = index;
    lastKey = '';
    paintCopy();
    scene?.update(state);
    $('.mc-equipment-status').textContent = lang() ? `${harnesses[index].name} 已装备到背部。` : `${harnesses[index].name} equipped on your back.`;
  }
  $('.mc-confirm').addEventListener('click',()=>equip(state.harness));
  wheel.addEventListener('click',event=>{
    const item=event.target.closest('[data-wheel-item]');
    if(item) equip(Number(item.dataset.wheelItem));
  });
  wheel.addEventListener('keydown',event=>{
    const item=event.target.closest('[data-wheel-item]');
    if(!item)return;
    const index=Number(item.dataset.wheelItem);
    if(event.key==='Enter'||event.key===' ') { event.preventDefault();equip(index); }
    else if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const next=(index+(['ArrowLeft','ArrowUp'].includes(event.key)?7:1))%8;
      state.harness=next;lastKey='';paintCopy();scene?.update(state);
      $$('[data-wheel-item]')[next].focus({preventScroll:true});
    }
  });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  $('.mc-scrub').addEventListener('input',event=>{
    const p=Number(event.target.value)/1000;
    if(manual()) { setProgress(p); return; }
    const pin=$('.mc-pin'), top=parseFloat(getComputedStyle(pin).top)||112;
    const target=scrollY+chapter.getBoundingClientRect().top-top+p*(chapter.offsetHeight-pin.offsetHeight);
    if(window.__lenis) window.__lenis.scrollTo(target,{immediate:true});
    else window.scrollTo({top:target,behavior:'instant'});
    setProgress(p);
  });
  $('.mc-pin').addEventListener('pointermove',event=>{
    if(reduced.matches || event.pointerType==='touch')return;
    const r=$('.mc-pin').getBoundingClientRect();
    state.pointer={x:(event.clientX-r.left)/r.width*2-1,y:(event.clientY-r.top)/r.height*2-1};
    scene?.update(state);
  },{passive:true});
  $('.mc-pin').addEventListener('pointerleave',()=>{state.pointer={x:0,y:0};scene?.update(state);});
  const floatingLabel = $('[data-mc-floating-harness]');
  function projectWeapon(projected) {
    const visible = projected?.visible && state.equippedHarness !== null;
    floatingLabel.hidden = !visible;
    if (!visible) return;
    const pin = $('.mc-pin');
    const x = Math.max(100, Math.min(pin.clientWidth - 100, projected.x));
    const y = Math.max(80, Math.min(pin.clientHeight - 100, projected.y));
    floatingLabel.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    $('[data-mc-floating-name]').textContent = HARNESS_NAMES[state.equippedHarness];
    $('[data-mc-floating-status]').textContent = lang() ? 'HARNESS · 就绪' : 'HARNESS · READY';
  }
  // Portal links ride on their doorways: all three at the entrance and at the end, the one in focus in between.
  function projectPortals(list) {
    const pin = $('.mc-pin'), allOpen = state.phase === 0 || state.phase === 5, roomPhase = state.phase >= 2 && state.phase <= 4;
    (list || []).forEach((p, i) => {
      const link = $(`[data-portal="${p.id}"]`); if (!link) return;
      // the wide shots show all three doors close together: a compact label in each doorway;
      // inside a room, the full link on its threshold
      const on = allOpen ? p.midVisible : roomPhase && i === state.room && p.visible;
      link.classList.toggle('is-on', on);
      link.classList.toggle('is-compact', on && allOpen);
      link.classList.toggle('is-active', on && roomPhase);
      link.tabIndex = on ? 0 : -1;
      if (!on) return;
      const px = allOpen ? p.mx : p.x, py = allOpen ? p.my : p.y, edge = allOpen ? 70 : 110;
      const x = Math.max(edge, Math.min(pin.clientWidth - edge, px)), y = Math.max(120, Math.min(pin.clientHeight - 150, py));
      link.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    });
    chapter.dataset.portals = 'projected';
  }
  async function load() {
    if(loading)return;loading=true;
    try {
      const {createArenaScene}=await import('./arena-scene.js?v=20261027-portal2');
      scene=createArenaScene($('.mc-canvas'), { onWeaponProject: projectWeapon, onPortalProject: projectPortals }); scene.update(state);
      $('.mc-fallback').hidden=true;chapter.dataset.renderer='webgl';
    } catch(error) {
      $('.mc-fallback').hidden=false;chapter.dataset.renderer='fallback';
      console.warn('Arena scene unavailable; the episode remains readable.',error);
    }
  }
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){load();schedule();}},{rootMargin:'300px'}).observe(chapter);
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-language]'))return;
    const r=$('.mc-pin').getBoundingClientRect();
    anchor=r.top>=0&&r.top<160&&r.bottom>innerHeight*.7?state.progress:null;
  },true);
  new MutationObserver(()=>{
    state.language=lang()?'zh':'en';lastKey='';setProgress(state.progress);
    if(anchor===null || manual())return;
    const p=anchor;anchor=null;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const pin=$('.mc-pin'), top=parseFloat(getComputedStyle(pin).top)||112;
      const y=scrollY+chapter.getBoundingClientRect().top-top+p*(chapter.offsetHeight-pin.offsetHeight);
      if(window.__lenis)window.__lenis.scrollTo(y,{immediate:true});else scrollTo({top:y,behavior:'instant'});
    }));
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  compact.addEventListener('change',()=>{lastKey='';setProgress(state.progress);schedule();});
  reduced.addEventListener('change',()=>{state.paused=reduced.matches;state.pointer={x:0,y:0};lastKey='';setProgress(state.progress);schedule();});
  $('.mc-canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();floatingLabel.hidden=true;$('.mc-fallback').hidden=false;chapter.dataset.renderer='fallback';});
  $('.mc-canvas').addEventListener('webglcontextrestored',()=>{scene?.dispose();scene=undefined;loading=false;load();});
  window.addEventListener('pagehide',e=>{if(!e.persisted){cancelAnimationFrame(frame);scene?.dispose();setRail.dispose();}});
  setProgress(0);
}
