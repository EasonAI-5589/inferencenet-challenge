/* A single scroll-owned timeline: camera, equipment, rooms and evidence all follow it. */
import { createTelemetry } from './arena-motion.js';

const chapter = document.querySelector('.mc-chapter');
if (chapter) {
  const $ = selector => chapter.querySelector(selector);
  const $$ = selector => [...chapter.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stops = [0, .16, .38, .57, .76, .93, 1];
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
  const lang = () => document.documentElement.lang.startsWith('zh') ? 1 : 0;
  const state = { progress: 0, phase: 0, harness: 0, equippedHarness: null, room: 0, pointer: { x: 0, y: 0 }, paused: reduced.matches, language: lang() ? 'zh' : 'en' };
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
  const phases = [
    { tag:['01 / ENTER THE ARENA','01 / 进入竞技场'], title:['Where Metacases<br><em>are made.</em>','Metacase<br><em>在这里生成。</em>'], body:['The Metacase Challenge is the first pipeline into the Metacase network. One agent takes on real, complete cases: raw evidence in, a deliverable that can be checked out.', 'Metacase 挑战赛是通往 Metacase 网络的第一条管线。一个 Agent 承接真实而完整的案例：输入原始证据，交出可以核查的成果。'], code:['THE METACASE CHALLENGE · THE FIRST PIPELINE INTO THE METACASE NETWORK','METACASE 挑战赛 · 通往 METACASE 网络的第一条管线'], label:['ENTER','进入'], event:['Every case begins as a question, its raw evidence and the practice that came before.', '每个案例都从一个问题、原始证据和既往做法开始。'] },
    { tag:['02 / THE HARNESS WHEEL','02 / HARNESS 装备轮'], title:['Same mind.<br><em>Different tools.</em>','同一个 Agent，<br><em>不同的装备。</em>'], body:['Scroll to browse eight harnesses. Click a slot or confirm below to carry its weapon into the arena.', '滚动浏览八种 Harness。点击轮盘区段或下方确认按钮，将武器背上，进入竞技场。'], code:['SCROLL TO BROWSE · CLICK TO EQUIP','滚动浏览 · 点击装备'], label:['EQUIP','装备'], event:['', ''] },
    { tag:['03 / ECONOMICS','03 / 经济'], title:['Rebuild<br><em>the result.</em>','重建<br><em>研究结果。</em>'], body:['Econometric replication. Inspect the data, reconstruct the specification and test against a withheld reference.', '计量经济学复现。检查数据、重建模型设定，并对照保留参考值核验。'], code:['ECONOMICS · STATISTICS · SOCIAL SCIENCE','经济学 · 统计学 · 社会科学'], label:['REPLICATE','复现'], event:['Read the source data → compare specifications → run the estimator → verify the result.', '读取源数据 → 比较模型设定 → 执行估计 → 验证结果。'] },
    { tag:['04 / FINANCE','04 / 金融'], title:['Follow<br><em>the evidence.</em>','追踪<br><em>每一条证据。</em>'], body:['Business Analysis & Deliverables. Reconcile the close, weigh correction options and produce a review that can be checked.', '业务分析与交付。核对关账资料、比较更正方案，生成可检查的审阅交付物。'], code:['FINANCE · ACCOUNTING · BUSINESS JUDGMENT','金融 · 会计 · 商业判断'], label:['RECONCILE','核对'], event:['Inspect ledgers and policy → reconcile discrepancies → deliver the workbook and review.', '检查账本与政策 → 核对差异 → 交付工作簿和审阅报告。'] },
    { tag:['05 / SOCIAL SCIENCE','05 / 社科'], title:['Turn analysis<br><em>into a decision.</em>','让分析<br><em>形成决策。</em>'], body:['Evaluate training impact. Connect findings, limitations and procurement criteria to a defensible recommendation.', '评估培训效果，将发现、局限与采购标准关联起来，形成有依据的建议。'], code:['HUMAN RESOURCES · IMPACT · PROCUREMENT','人力资源 · 效果评估 · 采购'], label:['DECIDE','决策'], event:['Compare outcomes → test explanations → document limits → recommend an action.', '比较结果 → 检验解释 → 记录局限 → 提出行动建议。'] },
    { tag:['06 / BECOMING A METACASE','06 / 成为 METACASE'], title:['Solved. Evaluated.<br><em>Kept as experience.</em>','解决、评测，<br><em>沉淀为经验。</em>'], body:['The whole run, from evidence and choices to actions and outcome, is kept intact. Once reviewed, it can join the network as a new Metacase.', '从证据、选择到行动与结果，整次运行被完整保存；经过审核后，可以作为新的 Metacase 加入网络。'], code:['REVIEWED RUNS CAN BECOME METACASES','经过审核的运行可以成为 METACASE'], label:['REMEMBER','沉淀'], event:['Preserve the whole episode. Retrieve not only similar facts, but similar problem-solving structures.', '保留完整过程。检索相似事实，也检索相似的解题结构。'] },
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
  let scene, telemetry, loading = false, frame = 0, visible = false, anchor = null, lastKey = '';
  function paintCopy() {
    const l = lang(), p = phases[state.phase], h = harnesses[state.harness];
    const equipped = harnesses[state.equippedHarness], browsing = state.phase === 1;
    const shown = browsing ? h : equipped;
    $('[data-mc-kicker]').textContent = p.tag[l];
    $('#system-title').innerHTML = p.title[l];
    $('[data-mc-body]').textContent = p.body[l];
    $('[data-mc-code]').textContent = p.code[l];
    $('[data-mc-equipped]').textContent = shown?.name || (l ? '等待选择装备' : 'Awaiting a loadout');
    $('[data-mc-equipped]').dataset.font = shown ? harnesses.indexOf(shown) : '';
    $('[data-mc-type]').textContent = shown?.type[l] || (l ? '在装备轮中确认你的 Harness' : 'Choose a harness at the equipment wheel');
    $('.mc-confirm').hidden = !browsing;
    $('.mc-confirm').disabled = state.equippedHarness === state.harness;
    $('.mc-confirm').textContent = state.equippedHarness === state.harness ? (l ? '已背负 ✓' : 'EQUIPPED ✓') : (l ? '确认装备 ↗' : 'EQUIP THIS HARNESS ↗');
    $('.mc-confirm').setAttribute('aria-label', l ? `确认装备 ${h.name}` : `Equip ${h.name}`);
    $('[data-mc-carried]').textContent = equipped ? (l ? `背负装备：${equipped.name}` : `ON YOUR BACK / ${equipped.name}`) : (l ? '尚未装备 · 点击确认' : 'NOT EQUIPPED · CLICK TO CONFIRM');
    $('[data-mc-carried]').hidden = !browsing;
    $('[data-mc-event]').textContent = state.phase === 1 ? h.description[l] : p.event[l];
    $('[data-mc-index]').textContent = String(state.phase + 1).padStart(2,'0');
    $('[data-mc-name]').textContent = l ? 'METACASE 挑战赛 / 竞技场' : 'METACASE CHALLENGE / THE ARENA';
    $('[data-mc-scroll-hint]').textContent = reduced.matches ? (l?'用下方进度条探索':'EXPLORE WITH THE SLIDER') : (l?'滚动，进入下一幕':'SCROLL TO EXPLORE');
    $('[data-mc-loadout-label]').textContent = browsing ? (l ? '预览装备 / HARNESS' : 'PREVIEW / HARNESS') : (l ? '背负装备 / HARNESS' : 'CARRIED / HARNESS');
    $('[data-mc-wheel-label]').textContent = l ? '滚动浏览 · 点击区段确认' : 'SCROLL TO BROWSE · CLICK A SLOT TO EQUIP';
    $('[data-mc-episode-label]').textContent = l ? 'METACASE / 轨迹' : 'METACASE / TRACE';
    $('[data-mc-illustrative]').textContent = l ? '概念演示 · 八种架构不是性能排名；三个案例房对应经济、金融与社科。' : 'Conceptual episode · Eight architectures, no performance ranking. Three case rooms, three fields.';
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
    $$('[data-mc-chapter]').forEach((el,i)=>el.style.setProperty('--chapter-fill',clamp((state.progress-stops[i])/(stops[i+1]-stops[i])).toFixed(4)));
    $('.mc-scrub').value = Math.round(state.progress*1000);
    chapter.dataset.progress = state.progress.toFixed(4);
    scene?.update(state);
    telemetry?.update(state);
  }
  function fromScroll() {
    frame = 0;
    if (reduced.matches) return;
    const rect = chapter.getBoundingClientRect(), pin = $('.mc-pin');
    const top = parseFloat(getComputedStyle(pin).top) || 112;
    const range = chapter.offsetHeight-pin.offsetHeight;
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
    telemetry?.update(state);
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
      state.harness=next;lastKey='';paintCopy();scene?.update(state);telemetry?.update(state);
      $$('[data-wheel-item]')[next].focus({preventScroll:true});
    }
  });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  $('.mc-scrub').addEventListener('input',event=>{
    const p=Number(event.target.value)/1000;
    if(reduced.matches) { setProgress(p); return; }
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
  async function load() {
    if(loading)return;loading=true;
    try {
      const {createArenaScene}=await import('./arena-scene.js?v=20261027-mc5');
      scene=createArenaScene($('.mc-canvas')); scene.update(state);
      telemetry=createTelemetry($('.mc-telemetry'));telemetry.update(state);
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
    if(anchor===null || reduced.matches)return;
    const p=anchor;anchor=null;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const pin=$('.mc-pin'), top=parseFloat(getComputedStyle(pin).top)||112;
      const y=scrollY+chapter.getBoundingClientRect().top-top+p*(chapter.offsetHeight-pin.offsetHeight);
      if(window.__lenis)window.__lenis.scrollTo(y,{immediate:true});else scrollTo({top:y,behavior:'instant'});
    }));
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  reduced.addEventListener('change',()=>{state.paused=reduced.matches;state.pointer={x:0,y:0};lastKey='';setProgress(state.progress);schedule();});
  $('.mc-canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();$('.mc-fallback').hidden=false;chapter.dataset.renderer='fallback';});
  $('.mc-canvas').addEventListener('webglcontextrestored',()=>{scene?.dispose();telemetry?.dispose();scene=telemetry=undefined;loading=false;load();});
  window.addEventListener('pagehide',e=>{if(!e.persisted){cancelAnimationFrame(frame);scene?.dispose();telemetry?.dispose();}});
  setProgress(0);
}
