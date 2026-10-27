/** The project taxonomy supplied on 2026-10-26: three directions, sixteen directories.
 * Directory membership is distinct from benchmark availability or measured results. */
export const HARNESS_NAMES = Object.freeze([
  'DeepSeek Harness', 'DeepAgents', 'Claude Code', 'Codex CLI', 'OpenCode',
  'OpenHands SDK', 'Terminus-2', 'mini-SWE-agent',
]);
export const MODEL_CHARACTERS = Object.freeze([
  {
    id: 'sol', name: 'GPT-5.6 Sol', short: 'GPT-5.6 Sol', provider: 'OpenAI', badge: 'SOL',
    role: ['Emerald Tactician · OpenAI', '翡翠统帅 · OpenAI'],
    color: '#10a37f', hull: 0x10a37f, limb: 0x0b4f3c, eye: 0xa7f3d0, trim: 0x34d399,
    // 6-petal interwoven OpenAI knot
    logo: 'M0-11 C5-11 9-7 9-2 C9 3 5 7 0 7 C-5 7 -9 3 -9-2 C-9-7 -5-11 0-11 Z M-8-5 C-4-11 4-11 8-5 C11 1 8 8 2 10 C-4 12 -10 8 -10 1 Z M-5 6 L5-6 M-6-1 L6 1 M0-7 L0 7',
  },
  {
    id: 'opus', name: 'Claude Opus 4.8', short: 'Opus 4.8', provider: 'Anthropic', badge: 'OPUS',
    role: ['Terracotta Scholar · Anthropic', '赤金学者 · Anthropic'],
    color: '#e07a5f', hull: 0xd97757, limb: 0x6e321f, eye: 0xfde68a, trim: 0xfbbf24,
    // Claude starburst spark
    logo: 'M0-12 L2.2-3.2 L10.4-6 L4 0 L10.4 6 L2.2 3.2 L0 12 L-2.2 3.2 L-10.4 6 L-4 0 L-10.4-6 L-2.2-3.2 Z',
  },
  {
    id: 'gemini', name: 'Gemini 3.1 Pro', short: 'Gemini 3.1', provider: 'Google', badge: 'GEMINI',
    role: ['Cosmic Twin-Core · Google', '星河双核 · Google'],
    color: '#6366f1', hull: 0x4f46e5, limb: 0x2e1065, eye: 0xe0e7ff, trim: 0xc084fc,
    // Gemini 4-point curved star
    logo: 'M0-12 Q1.5-1.5 12 0 Q1.5 1.5 0 12 Q-1.5 1.5 -12 0 Q-1.5-1.5 0-12 Z',
  },
  {
    id: 'kimi', name: 'Kimi K3', short: 'Kimi K3', provider: 'Moonshot', badge: 'KIMI',
    role: ['Moonlit Explorer · Moonshot', '月影探索 · Moonshot'],
    color: '#38bdf8', hull: 0x1e3a5f, limb: 0x0f172a, eye: 0x7dd3fc, trim: 0x38bdf8,
    // Crescent moon + star
    logo: 'M3-11 A11 11 0 1 0 11 5 A8.5 8.5 0 1 1 3-11 Z M6-5 L7.5-1.5 L11 0 L7.5 1.5 L6 5 L4.5 1.5 L1 0 L4.5-1.5 Z',
  },
  {
    id: 'deepseek', name: 'DeepSeek V4 Pro', short: 'DeepSeek V4', provider: 'DeepSeek', badge: 'DEEPSEEK',
    role: ['Cobalt Reasoner · DeepSeek', '深海推演 · DeepSeek'],
    color: '#2563eb', hull: 0x1d4ed8, limb: 0x172554, eye: 0x67e8f9, trim: 0x06b6d4,
    // Whale / wave crest
    logo: 'M-11 2 C-11-6 -3-10 4-7 C8-5 10-1 11-6 L12 1 C9 7 2 10 -5 8 C-9 7 -11 5 -11 2 Z M-3-2 A1.8 1.8 0 1 0 0.6-2 A1.8 1.8 0 1 0 -3-2 Z',
  },
  {
    id: 'qwen', name: 'Qwen3.7-Max', short: 'Qwen3.7-Max', provider: 'Alibaba', badge: 'QWEN',
    role: ['Violet Vanguard · Qwen', '紫晶先锋 · Qwen'],
    color: '#d946ef', hull: 0x9333ea, limb: 0x4a044e, eye: 0xfbcfe8, trim: 0xf43f5e,
    // Hexagonal star-crest
    logo: 'M0-12 L10.4-6 L10.4 6 L0 12 L-10.4 6 L-10.4-6 Z M0-6 L5.2-3 L5.2 3 L0 6 L-5.2 3 L-5.2-3 Z',
  },
]);
export const ARENA_DOMAINS = Object.freeze([
  {
    id: 'econ', name: ['Economics', '经济'], color: 0x45b5b0,
    summary: ['From empirical evidence to economic understanding.', '从实证证据出发，理解经济运行。'],
    danmaku: [
      ['econ.replication · 100 Dev100 Econometric Replications', 'econ.replication · Dev100 100 篇顶刊计量复现'],
      ['OLS · DID · IV · RDD Coefficient & SE Fidelity', 'OLS · DID · IV · RDD 回归系数与标准误精确核验'],
      ['econ.monetary · FOMC & Central-Bank Stance Analysis', 'econ.monetary · 央行声明与 FOMC 货币政策立场判读'],
      ['econ.markets · Market Signal & Price Movement Calibration', 'econ.markets · 噪声下的市场信号与价格走势预测'],
      ['econ.data · Multi-Source SQL & dbt Data Engineering', 'econ.data · 多源异构商业与经济数据 SQL/dbt 工程'],
      ['econ.statistics · Official Macro Statistics Synthesis', 'econ.statistics · 官方宏观统计跨源检索与结构化合成'],
      ['Harbor Sandbox · Sealed References · Full Trajectory', 'Harbor 容器沙箱 · 隐藏参考答案 · 完整轨迹留存'],
      ['152 Candidate Records · 5 Economics Classes', '152 条经济候选记录 · 5 个二级目录'],
    ],
    entries: [
      { id: 'econ.replication', name: ['Econometric replication', '计量经济复现'], description: ['Clean research data, align empirical specifications and reproduce OLS, DID, IV and RDD coefficients.', '论文清洗、实证设定对齐、OLS/DID/IV/RDD 系数复现。'] },
      { id: 'econ.monetary', name: ['Monetary policy communication', '货币政策沟通'], description: ['Interpret central-bank statements and minutes, interest-rate paths and macroeconomic expectations.', '央行声明与纪要立场判断、利率路径与宏观预期。'] },
      { id: 'econ.markets', name: ['Market forecasting', '市场走势预测'], description: ['Assess price movements under noise, interpret market signals and calibrate against base rates.', '噪声下的价格波动判断、市场信号与基准率校准。'] },
      { id: 'econ.data', name: ['Economic & business data engineering', '经济与商业数据工程'], description: ['Join heterogeneous data sources, align metric definitions and build SQL/dbt transformations.', '多源异构库表关联、指标口径对齐、SQL/dbt 转换。'] },
      { id: 'econ.statistics', name: ['Official statistics synthesis', '官方统计数据综合'], description: ['Retrieve macroeconomic and official statistics, cross-check sources and synthesize structured results.', '宏观与官方统计检索、跨源交叉核对、结构化合成。'] },
    ],
  },
  {
    id: 'fin', name: ['Finance', '金融'], color: 0xf2b545,
    summary: ['Turn financial evidence into accountable decisions.', '让金融证据形成可核验的判断与交付。'],
    danmaku: [
      ['fin.accounting · Month-End Close Word + Excel Deliverables', 'fin.accounting · 集团月结调账与 Word+Excel 双文档交付'],
      ['FIN-T1-003 · 47 Source Records & 27-Item Rubric Judge', 'FIN-T1-003 · 47 份业务凭证交叉核对 + 27 项 Rubric 裁判'],
      ['fin.filings · Long SEC Filings QA & Multi-Step Reasoning', 'fin.filings · SEC 长篇财报跨表勾稽与多步数值推演'],
      ['fin.payments · Payment Reconciliation & Fee Rules', 'fin.payments · 交易流水对账、费率结算与异常排查'],
      ['fin.credit · Borrower Risk Scoring & Fraud Detection', 'fin.credit · 借款人特征评估、信贷审批与反欺诈识别'],
      ['fin.numeric · Valuation, Sensitivity & Table Arithmetic', 'fin.numeric · 财务报表核算、估值与敏感度多步推演'],
      ['fin.nlp · Financial Disclosure Sentiment & Event Extraction', 'fin.nlp · 金融公告语义理解、情绪极性与事件抽取'],
      ['90 Candidate Records · 6 Finance Classes', '90 条金融候选记录 · 6 个二级目录'],
    ],
    entries: [
      { id: 'fin.accounting', name: ['Accounting close & deliverables', '会计结账与财务交付'], description: ['Reconcile ledgers, apply accounting standards, prepare adjustments, reports and workpapers.', '台账核对、准则适用、调账分录、报告与底稿交付。'] },
      { id: 'fin.filings', name: ['Financial filings & research Q&A', '财报与金融研究问答'], description: ['Search long financial filings, reconcile statements and cite multi-step numerical reasoning.', '长篇财报检索、跨表勾稽、多步数值推理与引证。'] },
      { id: 'fin.payments', name: ['Payments & transaction analysis', '支付与交易数据分析'], description: ['Reconcile transactions, apply fee and settlement rules, investigate anomalies and aggregate data.', '交易流水对账、费率与结算规则、异常排查与聚合。'] },
      { id: 'fin.credit', name: ['Credit risk & fraud detection', '信用风险与欺诈识别'], description: ['Assess borrower and transaction features, judge default risk and detect fraud.', '借款人与交易特征评估、违约判断、欺诈检测。'] },
      { id: 'fin.numeric', name: ['Financial numerical reasoning', '金融数值推理'], description: ['Calculate financial statements, valuations and sensitivities with multi-step quantitative reasoning.', '财务报表核算、估值与敏感度计算、多步量化推演。'] },
      { id: 'fin.nlp', name: ['Financial language understanding', '金融文本理解'], description: ['Understand financial announcements, classify sentiment and extract events.', '金融公告语义理解、情绪极性判断与事件抽取。'] },
    ],
  },
  {
    id: 'soc', name: ['Social Science', '社科'], color: 0x7d6ad8,
    summary: ['Understand people, institutions and the decisions between them.', '理解个体、组织与制度，形成有依据的决策。'],
    danmaku: [
      ['soc.law · LawBench Statute Recall & Legal Reasoning', 'soc.law · LawBench 法条适用、合规边界与案例裁量'],
      ['soc.hr · HR-T3-114 Training & Procurement Workbook', 'soc.hr · HR-T3-114 培训成效评估与采购验收决策底稿'],
      ['soc.business · CRM Lifecycle & Operations Analytics', 'soc.business · CRM 客户生命周期与商业运营指标分析'],
      ['soc.society · Survey, Demographic & Education Data', 'soc.society · 社会调查、人口与教育异构表聚合分析'],
      ['soc.psychology · Behavioral & Cognitive Experiment Analysis', 'soc.psychology · 行为与认知实验统计检验与科学计算'],
      ['Word Decision Memo + Excel Evidence Workbook', 'Word 决策备忘录 + Excel 证据溯源底稿'],
      ['Deterministic Verifiers + Multi-Dimensional Rubrics', '确定性代码核验 + 多维业务 Rubric 细粒度归因'],
      ['43 Candidate Records · 5 Social Science Classes', '43 条社科候选记录 · 5 个二级目录'],
    ],
    entries: [
      { id: 'soc.law', name: ['Law & regulation', '法律与监管'], description: ['Apply legal provisions, review compliance boundaries and reason over cases and judgments.', '法条适用、合规边界审查、法律推理与案例裁量。'] },
      { id: 'soc.hr', name: ['People & organizational analysis', '人力资源与组织分析'], description: ['Diagnose organizations, calculate compensation and performance, schedule work and propose policies.', '组织诊断、薪酬绩效核算、工时排程与制度建议。'] },
      { id: 'soc.business', name: ['Business operations & CRM', '商业运营与客户管理'], description: ['Analyze business processes, manage customer lifecycles and interpret CRM operating metrics.', '业务流程分析、客户生命周期管理、CRM 运营指标。'] },
      { id: 'soc.society', name: ['Society, education & survey data', '社会、教育与调查数据'], description: ['Interpret survey, population and education data and aggregate heterogeneous tables.', '社会调查与人口教育数据语义理解、异构表聚合。'] },
      { id: 'soc.psychology', name: ['Psychology & cognitive science', '心理与认知科学'], description: ['Analyze behavioral and cognitive experiments, perform statistical tests and scientific computing.', '行为与认知实验数据分析、统计检验与科学计算。'] },
    ],
  },
]);
