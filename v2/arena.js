/* A single scroll-owned timeline: camera, equipment, rooms and evidence all follow it. */
import { createSignatureRail } from './mc-rail.js?v=20261027-frontgun';
import { ARENA_DOMAINS, HARNESS_NAMES, MODEL_CHARACTERS } from './arena-data.js?v=20261027-frontgun';

const chapter = document.querySelector('.mc-chapter');
if (chapter) {
  const $ = selector => chapter.querySelector(selector);
  const $$ = selector => [...chapter.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 860px) and (max-height: 720px)');
  const manual = () => reduced.matches || compact.matches;
  const stops = [0, .16, .38, .57, .76, .93, 1];
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const ease = x => { const p = clamp(x); return p * p * (3 - 2 * p); };
  const lang = () => document.documentElement.lang.startsWith('zh') ? 1 : 0;
  const state = { progress: 0, arrival: manual() ? 1 : 0, phase: 0, model: 0, modelSpin: 0, harness: 0, equippedHarness: 0, room: 0, pointer: { x: 0, y: 0 }, paused: reduced.matches, language: lang() ? 'zh' : 'en' };
  const models = MODEL_CHARACTERS;
  const harnesses = [
    { name: 'DeepSeek Harness', lines: ['DeepSeek', 'Harness'], code: 'W-01', type: ['Plugin runtime', '插件运行时'], description: ['Swap the runtime weapon. Recompose the tools, context and feedback around your chosen model character.', '切换运行时武器，围绕当前模型角色重新组织工具、上下文与反馈。'] },
    { name: 'DeepAgents', lines: ['DeepAgents'], code: 'W-02', type: ['Library harness', '库式 Harness'], description: ['Equip a planning-oriented harness weapon. Make the workflow and working context part of the setup.', '装备面向规划的 Harness 武器，将工作流与上下文纳入配置。'] },
    { name: 'Claude Code', lines: ['Claude', 'Code'], code: 'W-03', type: ['CLI harness', '命令行 Harness'], description: ['Load a different execution loop weapon. The challenge still begins with the same evidence.', '装载不同的执行循环武器，挑战仍从同一份证据出发。'] },
    { name: 'Codex CLI', lines: ['Codex', 'CLI'], code: 'W-04', type: ['CLI harness', '命令行 Harness'], description: ['Exchange the tool interface and execution environment weapon around the model character.', '为模型角色更换周围的工具接口与执行环境武器。'] },
    { name: 'OpenCode', lines: ['OpenCode'], code: 'W-05', type: ['Server runtime', '服务式运行时'], description: ['Another weapon slot, another way to organize the model character’s work.', '另一套武器槽位，用另一种方式组织模型角色的工作。'] },
    { name: 'OpenHands SDK', lines: ['OpenHands', 'SDK'], code: 'W-06', type: ['Agent runtime', 'Agent 运行时'], description: ['Connect the character, conversation and workspace through a different runtime weapon.', '通过不同的运行时武器连接角色、会话与工作空间。'] },
    { name: 'Terminus-2', lines: ['Terminus', '-2'], code: 'W-07', type: ['Reference loop', '参考执行循环'], description: ['Equip a terminal-oriented loop weapon. Tools turn proposed actions into observable results.', '装备面向终端的执行循环武器，让工具将行动转化为可观察结果。'] },
    { name: 'mini-SWE-agent', lines: ['mini-SWE', 'agent'], code: 'W-08', type: ['Minimal loop', '精简执行循环'], description: ['Strip the loop back to its essentials. Both character and weapon are variables; evidence remains the anchor.', '将循环简化到核心。模型角色与 Harness 武器皆可切换，证据始终是依据。'] },
  ];
  // Each room is a portal to its track on the Challenge page.
  const TRACKS = { econ: 'challenge.html?via=portal#track-econ', fin: 'challenge.html?via=portal#track-fin', soc: 'challenge.html?via=portal#track-soc' };
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
    { tag:['02 / CHARACTER & HARNESS WHEEL','02 / 角色与 HARNESS 装备轮'], title:['Model is the character.<br><em>Harness is the weapon.</em>','模型是角色，<br><em>Harness 是武器。</em>'], body:['Switch between six 3D model characters at the center, then spin the 3D armory wheel to equip one of eight harness weapons.', '在中心切换六款 3D 模型角色（Model），再转动立体武器轮盘，为它装载趁手的 Harness 武器。'], code:['PICK A MODEL CHARACTER · EQUIP A HARNESS WEAPON','切换模型角色 · 装备 HARNESS 武器'], label:['EQUIP','装备'], event:['', ''] },
    ...ARENA_DOMAINS.map((domain, i) => ({
      tag: [`0${i + 3} / ${domain.id.toUpperCase()}`, `0${i + 3} / ${domain.name[1]}`],
      title: [`${domain.name[0]}<br><em>${domainHeadlines[i][0]}</em>`, `${domain.name[1]}<br><em>${domainHeadlines[i][1]}</em>`],
      body: domain.summary,
      code: [`${domain.id}/ · ${domain.entries.length} CASE CATEGORIES`, `${domain.id}/ · ${domain.entries.length} 个二级目录`],
      label: [domain.name[0].toUpperCase(), domain.name[1]], event: domainEvents[i],
    })),
    { tag:['06 / CHOOSE YOUR TRACK','06 / 选择赛道'], title:['Step through.<br><em>Pick your track.</em>','选一扇门，<br><em>进入你的赛道。</em>'], body:['All three portals are open. Every track runs the same loop: raw evidence in, a deliverable out, the whole trajectory kept.', '三扇门都已打开。每条赛道都是同一个闭环：输入原始证据，交出可核查的成果，完整保留执行轨迹。'], code:['THREE PORTALS · ONE CHALLENGE','三扇门 · 一个挑战赛'], label:['CHOOSE','选择赛道'], event:['Click a portal to enter its track.', '点击任意一扇门，进入对应赛道。'] },
  ];
  // 3D-shaded multi-layer weapon silhouettes (hull shadow, bevel body, specular top rail, glowing plasma core)
  const weapon3DSprites = [
    { body: 'M-36-7h16l6-8H14v6h28v9H8L-2 14h-13l3-13h-24Z', top: 'M-34-7h14l6-7h26v4H-10Z', core: 'M-6-4h18v4H-6Z M22-3h18v3H22Z' },
    { body: 'M-36-9h14v-6h32v6h26v11H5l-9 14h-13l4-14h-23Z', top: 'M-22-15h32v5h24v3H-22Z', core: 'M-10-8h22v5H-10Z M22-7h16v4H22Z' },
    { body: 'M-35-8h23l5-8h18l7 8h20V4H8L0 15h-14l4-13h-25Z', top: 'M-12-16h18l6 7h19v3H-14Z', core: 'M-6-6h20v5H-6Z M18-4h18v3H18Z' },
    { body: 'M-35-10h52v6h22v9H9l-8 12h-14l4-13h-26Z', top: 'M-35-10h52v4h20v3H-35Z', core: 'M-18-5h28v4H-18Z M20-5h17v4H20Z' },
    { body: 'M-34-7h20l6-8h24v6h22v12H8L0 15h-13l3-13h-24Z', top: 'M-14-15h24v5h21v3H-18Z', core: 'M-8-6h22v6H-8Z M20-4h16v4H20Z' },
    { body: 'M-34-9h15l8-7H8l9 8h23V5H8L0 15h-13l4-12h-25Z', top: 'M-19-9l8-7H8l8 7h22v3H-19Z', core: 'M-6-7h16v6H-6Z M20-5h18v4H20Z' },
    { body: 'M-38-7h29l6-8h21v6h26v9H5L-2 15h-13l5-13h-28Z', top: 'M-9-15h21v5h25v3H-13Z', core: 'M-8-5h24v5H-8Z M22-4h19v3H22Z' },
    { body: 'M-29-9h46v6h18v8H4L-3 15h-13l6-12h-19Z', top: 'M-29-9h46v4h17v3H-29Z', core: 'M-16-4h22v4H-16Z M12-4h20v3H12Z' },
  ];
  const polar = (r, a) => [300 + Math.cos(a) * r, 300 + Math.sin(a) * r];
  const pt = p => p.map(x => x.toFixed(2)).join(' ');
  const ringSlice = (rOut, rIn, a, b) => `M${pt(polar(rOut,a))} A${rOut} ${rOut} 0 0 1 ${pt(polar(rOut,b))} L${pt(polar(rIn,b))} A${rIn} ${rIn} 0 0 0 ${pt(polar(rIn,a))}Z`;
  const wheel = $('.mc-wheel svg');
  wheel.innerHTML = `<defs>
      <radialGradient id="mc-wheel-depth" cx="50%" cy="50%" r="50%">
        <stop offset="52%" stop-color="#0a101d" stop-opacity="0.18"/>
        <stop offset="82%" stop-color="#111a2e" stop-opacity="0.62"/>
        <stop offset="100%" stop-color="#1c2942" stop-opacity="0.88"/>
      </radialGradient>
      <filter id="mc-gun-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity="0.65"/>
      </filter>
    </defs>
    <circle class="mc-wheel-bezel-outer" cx="300" cy="300" r="290"/>
    <circle class="mc-wheel-bezel-inner" cx="300" cy="300" r="154"/>
    <circle class="mc-wheel-hub-ring" cx="300" cy="300" r="144"/>`
    + Array.from({length:72},(_,i)=>{ const a=i*Math.PI/36;return `<path class="mc-wheel-tick" d="M${pt(polar(284,a))}L${pt(polar(i%9===0?294:288,a))}"/>`; }).join('')
    + harnesses.map((h, i) => {
      const mid = -Math.PI / 2 + i * Math.PI / 4, a = mid - Math.PI / 8 + .018, b = mid + Math.PI / 8 - .018;
      const c = polar(208, mid), textPos = polar(252, mid), sp = weapon3DSprites[i];
      return `<g data-wheel-item="${i}">
        <path class="mc-sector-depth" d="${ringSlice(282, 160, a, b)}" transform="translate(0, 4)"/>
        <path class="mc-sector" d="${ringSlice(280, 162, a, b)}"/>
        <path class="mc-sector-window" d="${ringSlice(236, 168, a + .014, b - .014)}"/>
        <path class="mc-sector-outer-arc" d="M${pt(polar(278,a+.01))} A278 278 0 0 1 ${pt(polar(278,b-.01))}"/>
        <path class="mc-sector-inner" d="M${pt(polar(166,a+.012))} A166 166 0 0 1 ${pt(polar(166,b-.012))}"/>
        <g class="mc-item-icon" transform="translate(${c[0]},${c[1]}) scale(.76)" filter="url(#mc-gun-shadow)">
          <path class="mc-gun-shadow-layer" d="${sp.body}" transform="translate(0, 4)"/>
          <path class="mc-gun-body-layer" d="${sp.body}"/>
          <path class="mc-gun-top-layer" d="${sp.top}"/>
          <path class="mc-gun-core-layer" d="${sp.core}"/>
        </g>
        <text class="mc-item-name" x="${textPos[0]}" y="${textPos[1] - (h.lines.length > 1 ? 4 : -4)}">${h.lines.map((line,j)=>`<tspan x="${textPos[0]}" dy="${j ? 16 : 0}">${line}</tspan>`).join('')}</text>
      </g>`;
    }).join('');
  const setRail = createSignatureRail($('.mc-timeline'), {
    onSelect(i) {
      const p = clamp(stops[i] + (stops[i + 1] - stops[i]) * .25);
      if (manual()) { setProgress(p); return; }
      const pin = $('.mc-pin'), top = parseFloat(getComputedStyle(pin).top) || 112;
      const target = scrollY + chapter.getBoundingClientRect().top - top + p * (chapter.offsetHeight - pin.offsetHeight);
      if (window.__lenis) window.__lenis.scrollTo(target);
      else window.scrollTo({ top: target, behavior: 'smooth' });
    },
  });
  let scene, loading = false, frame = 0, visible = false, anchor = null, lastKey = '';
  function selectModel(index) {
    state.model = clamp(index, 0, models.length - 1);
    state.modelSpin = (state.modelSpin || 0) + 1;
    try { localStorage.setItem('metacase-loadout', JSON.stringify({ model: state.model, harness: state.equippedHarness ?? state.harness ?? 0 })); } catch {}
    lastKey = '';
    paintCopy();
    scene?.update(state);
    const m = models[state.model];
    $('.mc-equipment-status').textContent = lang() ? `已切换角色：${m.name}` : `${m.name} character selected.`;
  }
  function buildModelSelectors() {
    const NS = 'http://www.w3.org/2000/svg';
    for (const container of [$('[data-mc-model-roster]'), $('[data-mc-model-chips]')]) {
      if (!container) continue;
      container.replaceChildren(...models.map((m, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mc-model-btn';
        btn.dataset.modelIndex = String(i);
        btn.dataset.mcModel = String(i);
        btn.style.setProperty('--mc-mcolor', m.color);
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '-14 -14 28 28');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', 'mc-model-logo');
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', m.logo);
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.4');
        path.setAttribute('stroke-linejoin', 'round');
        svg.append(path);
        const label = document.createElement('span');
        label.textContent = m.short;
        btn.append(svg, label);
        btn.addEventListener('click', event => {
          event.stopPropagation();
          selectModel(i);
        });
        return btn;
      }));
    }
  }
  buildModelSelectors();
  function paintCopy() {
    const l = lang(), p = phases[state.phase], h = harnesses[state.harness], m = models[state.model] || models[0];
    const equipped = harnesses[state.equippedHarness], browsing = state.phase === 1;
    const shown = browsing ? h : equipped;
    const inDomain = state.phase >= 2 && state.phase <= 4;
    const domain = ARENA_DOMAINS[state.room];
    chapter.dataset.domain = inDomain ? domain.id : '';
    chapter.dataset.model = m.id;
    chapter.style.setProperty('--domain-accent', ['var(--track-1)', 'var(--track-2)', 'var(--mc-violet)'][state.room]);
    chapter.style.setProperty('--model-accent', m.color);
    if ($('[data-mc-model-label]')) $('[data-mc-model-label]').textContent = l ? '模型角色 / MODEL' : 'CHARACTER / MODEL';
    if ($('[data-mc-equipped-model]')) $('[data-mc-equipped-model]').textContent = m.name;
    if ($('[data-mc-hub-role]')) $('[data-mc-hub-role]').textContent = m.role[l];
    if ($('[data-mc-hub-model]')) $('[data-mc-hub-model]').textContent = m.name;
    $$('[data-model-index]').forEach(btn => {
      const idx = Number(btn.dataset.modelIndex), active = idx === state.model;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
      btn.title = `${models[idx].name} · ${models[idx].role[l]}`;
    });
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
      item.append(code, name);
      item.addEventListener('click', () => {
        const portalLink = $(`[data-portal="${domain.id}"]`);
        if (portalLink) portalLink.click();
      });
      return item;
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
    $('[data-mc-loadout-label]').textContent = browsing ? (l ? '预览武器 / HARNESS' : 'WEAPON / HARNESS') : inDomain && equipped ? (l ? '悬浮武器 / HARNESS' : 'DEPLOYED / HARNESS') : (l ? '背负武器 / HARNESS' : 'WEAPON / HARNESS');
    $('[data-mc-wheel-label]').textContent = manual()
      ? (l ? '切换中心角色 · 点击外圈槽位装备武器' : 'PICK A MODEL · CLICK A SLOT TO EQUIP WEAPON')
      : (l ? '切换中心角色 · 滚动或点击外圈装备武器' : 'SWITCH MODEL · SCROLL OR CLICK TO EQUIP WEAPON');
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
    const key = `${state.phase}:${state.model}:${state.harness}:${state.equippedHarness}:${lang()}`;
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
    const pin = $('.mc-pin'), allOpen = (state.phase === 0 && state.progress < .105) || state.phase === 5, roomPhase = state.phase >= 2 && state.phase <= 4;
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
    (list || []).forEach(p => { lastPortals[p.id] = p; });
  }
  // Pointing at a portal makes its doorway surge; stepping through floods it, warps the
  // page into it and opens its track on the Challenge page.
  const lastPortals = {};
  const portalOf = link => link.dataset.portal || (state.phase >= 2 && state.phase <= 4 ? ARENA_DOMAINS[state.room].id : '');
  $$('[data-portal], [data-mc-enter]').forEach(link => {
    const focus = on => { if (state.portalCharge) return; state.portalFocus = on ? portalOf(link) : ''; scene?.update(state); };
    link.addEventListener('pointerenter', () => focus(true));
    link.addEventListener('pointerleave', () => focus(false));
    link.addEventListener('focus', () => focus(true));
    link.addEventListener('blur', () => focus(false));
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const id = portalOf(link); if (!id) return;
      event.preventDefault();
      const pin = $('.mc-pin').getBoundingClientRect(), p = lastPortals[id], r = link.getBoundingClientRect();
      const at = p && p.centreVisible, x = at ? pin.left + p.cx : r.left + r.width / 2, y = at ? pin.top + p.cy : r.top + r.height / 2;
      state.portalFocus = id; state.portalCharge = true; scene?.update(state);
      const href = link.href;
      const chosenHarness = state.equippedHarness ?? state.harness ?? 0;
      try { localStorage.setItem('metacase-loadout', JSON.stringify({ model: state.model || 0, harness: chosenHarness })); } catch {}
      setTimeout(() => import('./portal-warp.js?v=20261027-frontgun').then(m => m.warp({ x, y, track: id, href, model: state.model || 0, harness: chosenHarness, lang: lang() })).catch(() => { location.href = href; }), scene ? 260 : 0);
    });
  });
  addEventListener('pageshow', event => { if (event.persisted) { state.portalCharge = false; state.portalFocus = ''; scene?.update(state); } });
  async function load() {
    if(loading)return;loading=true;
    try {
      const {createArenaScene}=await import('./arena-scene.js?v=20261027-frontgun');
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
