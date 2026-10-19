/* Local, curated translations. Preserve elements, event handlers, raw code,
 * values and URLs; remember the original text when dynamic views repaint. */
(() => {
  const scriptURL = document.currentScript.src;
  const storageKey = 'inferencenet-language';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const common = {
    'Home': '首页', 'Data': '数据', 'Agent': '智能体', 'Evolution': '自进化', 'Self-evolving': '自进化', 'Leaderboard': '排行榜',
    'Teams': '团队', 'Challenge': '挑战赛', 'Contact': '联系', 'Menu': '菜单', 'Light': '浅色', 'Dark': '深色',
    'Subtrack 1': '赛道一', 'Subtrack 2': '赛道二', 'Overview': '概览', 'Harness': 'Harness',
    'Subtrack 1: Econometric replication': '赛道一：计量经济学复现',
    'Subtrack 2: Business Analysis & Deliverables': '赛道二：业务分析与交付',
    'Challenge navigation': '挑战赛导航', 'Econometric replication': '计量经济学复现',
    'Subtrack 1 · Econometric replication': '赛道一 · 计量经济学复现',
    'Subtrack 2 · Business Analysis & Deliverables': '赛道二 · 业务分析与交付',
    'AI Agents for Business, Finance and Social Science': '面向商业、金融与社会科学的 AI 智能体',
    'AI Agents for Business, Finance and Social Science.': '面向商业、金融与社会科学的 AI 智能体。',
    'Dark theme': '深色主题', 'Switch to dark theme': '切换深色主题',
    'Skip to content': '跳转到正文', 'Main navigation': '主导航',
    'On this page': '本页导航', 'Legend': '图例', 'Rank': '排名',
    'Model': '模型', 'Model ID': '模型 ID', 'Score': '得分',
    'Compilation Success': '执行成功率', 'Partial Replication': '部分复现率',
    'Correct Coefficient Direction': '系数方向正确率',
    'Significant Level Correctness': '显著性水平正确率',
    'Public leaderboard': '公开排行榜', 'Internal study': '内部实验',
    'Previous': '上一步', 'Next': '下一步', 'Refresh': '刷新',
    'No entries.': '暂无记录。', '0% · base camp': '0% · 起点',
    'How to read this page': '本页阅读路线', 'Quick read': '快速理解', 'Full route': '完整阅读',
    'Scroll sideways to see the whole figure →': '左右滑动查看完整图示 →', 'Scroll sideways to see every column →': '左右滑动查看全部列 →',
  };
  const skipped = 'script,style,pre,code,textarea,[data-no-translate],.wordmark,[data-language-control]';
  const attributes = ['aria-label', 'title', 'alt', 'placeholder'];
  const textRecords = new WeakMap();
  const attributeRecords = new WeakMap();
  let dictionary = common;
  let language = 'en';
  let requested = 'en';
  let dictionaryPromise;
  let observer;
  let controls;
  let status;
  try { if (localStorage.getItem(storageKey) === 'zh') requested = 'zh'; } catch {}

  function translate(value) {
    if (Object.hasOwn(dictionary, value)) return dictionary[value];
    // UI strings composed from live counts, dates or the selected metric.
    let m;
    if ((m = value.match(/^Step (\d+) of (\d+)$/))) return `第 ${m[1]} / ${m[2]} 步`;
    if ((m = value.match(/^(\d+) entries$/))) return `${m[1]} 条记录`;
    if ((m = value.match(/^(.+) · (\d+) entries · (.+)$/))) return `${translate(m[1])} · ${m[2]} 条记录 · ${translate(m[3])}`;
    if ((m = value.match(/^(.+) · Model$/))) return `${m[1]} · 模型`;
    if ((m = value.match(/^Sorted by (.+) · (\d+) entries$/))) return `按${translate(m[1])}排序 · ${m[2]} 条记录`;
    if ((m = value.match(/^Synced from Hugging Face · Fetched (.+)$/))) return `已从 Hugging Face 同步 · 获取时间 ${m[1]}`;
    if ((m = value.match(/^Checking Hugging Face · Showing data fetched (.+)$/))) return `正在检查 Hugging Face · 当前数据获取于 ${m[1]}`;
    if ((m = value.match(/^Checking Hugging Face · (.+)$/))) return `正在检查 Hugging Face · ${translate(m[1])}`;
    if ((m = value.match(/^Latest fetch unavailable · Showing data fetched (.+)$/))) return `最新数据获取失败 · 当前数据获取于 ${m[1]}`;
    if ((m = value.match(/^(.+) · Latest fetch unavailable; showing saved snapshot\.$/))) return `${translate(m[1])} · 最新数据获取失败，显示已保存的快照。`;
    if ((m = value.match(/^Ranked entries by (.+)$/))) return `按${translate(m[1])}排列的记录`;
    if ((m = value.match(/^(.+) \(internal study\)$/))) return `${m[1]}（内部实验）`;
    if ((m = value.match(/^(.+) — ranked by (.+?)( \(.+\))?\.$/))) return `${translate(m[1])} — 按${translate(m[2])}排序${m[3] || ''}。`;
    if ((m = value.match(/^(.+): (\d+) entries climbing by (.+?)(; leader (.+) at (.+))?\.$/))) return `${translate(m[1])}：${m[2]} 条记录，按${translate(m[3])}排列${m[4] ? `；领先模型 ${translate(m[5])}，得分 ${m[6]}` : ''}。`;
    if ((m = value.match(/^Altitude is (.+); the summit flag marks (.+)\. Leader: (.+) at (.+)\. Full ranking in the table below\.$/))) return `高度表示${translate(m[1])}；顶峰标记为 ${m[2]}。领先模型：${translate(m[3])}，得分 ${m[4]}。完整排名见下表。`;
    return value;
  }

  function renderValue(current, record) {
    // If another component changed this value, treat its new English string
    // as the source. Our own translated value is never used as a source.
    const original = record && current === record.rendered ? record.original : current;
    const normalized = normalize(original);
    const translated = language === 'zh' ? translate(normalized) : normalized;
    const rendered = translated === normalized ? original : original.replace(/\S[\s\S]*\S|\S/, () => translated);
    return { original, rendered };
  }

  function renderText(node) {
    if (!node.parentElement || node.parentElement.closest(skipped) || !normalize(node.data)) return;
    const record = renderValue(node.data, textRecords.get(node));
    textRecords.set(node, record);
    if (node.data !== record.rendered) node.data = record.rendered;
  }

  function renderAttributes(element) {
    if (element.closest(skipped)) return;
    const records = attributeRecords.get(element) || {};
    for (const name of attributes) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name);
      const record = renderValue(current, records[name]);
      records[name] = record;
      if (current !== record.rendered) element.setAttribute(name, record.rendered);
    }
    attributeRecords.set(element, records);
  }

  function renderTree(root) {
    if (root.nodeType === Node.TEXT_NODE) { renderText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(skipped)) return;
    renderAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches(skipped)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) renderText(node);
      else renderAttributes(node);
    }
  }

  const observe = () => observer.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: attributes,
  });

  function apply() {
    observer.disconnect();
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    renderTree(document.documentElement);
    controls.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    observe();
    // Let existing chart/layout components measure the translated labels.
    window.dispatchEvent(new Event('resize'));
  }

  function loadDictionary() {
    if (!dictionaryPromise) {
      const filename = location.pathname.split('/').pop() || 'index.html';
      const page = ['index.html', 'challenge.html', 'harness.html', 'evolution.html', 'leaderboard.html', 'teams.html', 'professional-tasks.html', 'replication.html'].includes(filename)
        ? filename.replace('.html', '') : 'index';
      const dictionaryURL = new URL(`assets/i18n/${page}.zh.json`, scriptURL);
      // Keep a page's release-tagged script and dictionary on the same version.
      dictionaryURL.search = new URL(scriptURL).search;
      // A page read once this session translates again without waiting for the network.
      const cacheKey = `inferencenet-i18n:${dictionaryURL.pathname}${dictionaryURL.search}`;
      let cached = null;
      try { cached = JSON.parse(sessionStorage.getItem(cacheKey)); } catch {}
      dictionaryPromise = (cached ? Promise.resolve(cached) : fetch(dictionaryURL)
        .then(response => { if (!response.ok) throw new Error('Translation unavailable'); return response.json(); })
        .then(values => {
          try { sessionStorage.setItem(cacheKey, JSON.stringify(values)); } catch {}
          return values;
        }))
        .then(values => {
          if (!values || Array.isArray(values) || typeof values !== 'object' || Object.values(values).some(value => typeof value !== 'string')) {
            throw new Error('Invalid translation dictionary');
          }
          dictionary = { ...values, ...common };
        })
        .catch(error => {
          dictionaryPromise = undefined;
          try { sessionStorage.removeItem(cacheKey); } catch {}
          throw error;
        });
    }
    return dictionaryPromise;
  }

  async function setLanguage(next, { animate = false } = {}) {
    controls.setAttribute('aria-busy', 'true');
    controls.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      if (next === 'zh') await loadDictionary();
      language = next;
      // A visitor's own switch, or a translation that arrives after the page is already
      // showing (a slow network outlasted theme.js's hold), crossfades the page instead
      // of swapping every word at once.
      const late = !animate && next === 'zh' && !document.documentElement.classList.contains('lang-pending');
      if ((animate || late) && document.startViewTransition) await document.startViewTransition(apply).updateCallbackDone;
      else apply();
      try { localStorage.setItem(storageKey, language); } catch {}
      status.textContent = language === 'zh' ? '已切换到中文' : 'Switched to English';
    } catch {
      status.textContent = '中文暂时无法加载，请重试。 Translation unavailable; please retry.';
    } finally {
      controls.setAttribute('aria-busy', 'false');
      controls.querySelectorAll('button').forEach(button => { button.disabled = false; });
      // theme.js holds a Chinese page's first paint until this point.
      document.documentElement.classList.remove('lang-pending');
    }
  }

  // Initial fragment positioning happens before async translation and font layout.
  // Re-align challenge articles and their data/task overviews once, unless the visitor has taken control.
  function prepareInitialTrackAlignment() {
    const hash = location.hash;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return async () => {}; }
    const target = document.getElementById(id);
    if (!target || !target.matches('article.track, #replication-data, #replication-dev100, #replication-demo, #improvement-directions, #challenge-harnesses, #harness-stage-roadmap, #rsi-versions')) return async () => {};
    let interrupted = false;
    const cancel = () => { interrupted = true; };
    const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    inputs.forEach(type => window.addEventListener(type, cancel, { passive: true }));
    const loaded = document.readyState === 'complete' ? Promise.resolve()
      : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
    return async () => {
      try {
        await loaded;
        if (document.fonts) await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (!interrupted && location.hash === hash && target.isConnected) {
          target.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
      } finally {
        inputs.forEach(type => window.removeEventListener(type, cancel));
      }
    };
  }

  function init() {
    const nav = document.querySelector('.nav-controls');
    if (!nav) { document.documentElement.classList.remove('lang-pending'); return; }
    controls = document.createElement('div');
    controls.className = 'language-switch';
    controls.dataset.languageControl = '';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', '语言 / Language');
    for (const [value, label, accessible] of [['zh', '中', '中文'], ['en', 'EN', 'English']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.language = value;
      button.lang = value === 'zh' ? 'zh-CN' : 'en';
      button.textContent = label;
      button.setAttribute('aria-label', accessible);
      button.setAttribute('aria-pressed', String(value === language));
      button.addEventListener('click', () => { void setLanguage(value, { animate: value !== language }); });
      controls.append(button);
    }
    status = document.createElement('span');
    status.className = 'visually-hidden';
    status.dataset.noTranslate = '';
    status.setAttribute('role', 'status');
    nav.prepend(controls);
    nav.append(status);
    observer = new MutationObserver(mutations => {
      observer.disconnect();
      const roots = new Set();
      for (const mutation of mutations) {
        if (mutation.type === 'childList') mutation.addedNodes.forEach(node => roots.add(node));
        else roots.add(mutation.target);
      }
      roots.forEach(root => { if (root.isConnected) renderTree(root); });
      observe();
    });
    observe();
    const alignTrack = prepareInitialTrackAlignment();
    if (requested === 'zh') void setLanguage('zh').then(alignTrack);
    else void alignTrack();
    // A page prerendered in the background (site.js) follows a language chosen meanwhile.
    if (document.prerendering) {
      document.addEventListener('prerenderingchange', () => {
        let stored = 'en';
        try { if (localStorage.getItem(storageKey) === 'zh') stored = 'zh'; } catch {}
        if (stored !== language) void setLanguage(stored);
      }, { once: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
