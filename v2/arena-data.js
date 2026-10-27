/** The project taxonomy supplied on 2026-10-26: three directions, sixteen directories.
 * Directory membership is distinct from benchmark availability or measured results. */
export const HARNESS_NAMES = Object.freeze([
  'DeepSeek Harness', 'DeepAgents', 'Claude Code', 'Codex CLI', 'OpenCode',
  'OpenHands SDK', 'Terminus-2', 'mini-SWE-agent',
]);
export const MODEL_CHARACTERS = Object.freeze([
  { id: 'sol', name: 'GPT-5.6 Sol', short: 'GPT-5.6 Sol', role: ['Tactician · Model', '战术统帅 · 模型角色'], color: '#45b5b0', hull: 0xf7f8fb, eye: 0x67f5ff, trim: 0x45b5b0 },
  { id: 'opus', name: 'Claude Opus 4.8', short: 'Opus 4.8', role: ['Scholar · Model', '深思学者 · 模型角色'], color: '#f2b545', hull: 0xfaf0dc, eye: 0xffd666, trim: 0xf2b545 },
  { id: 'gemini', name: 'Gemini 3.1 Pro', short: 'Gemini 3.1', role: ['Twin-Core · Model', '双核感知 · 模型角色'], color: '#7d6ad8', hull: 0xe6edff, eye: 0xc4a7ff, trim: 0x7d6ad8 },
  { id: 'kimi', name: 'Kimi K3', short: 'Kimi K3', role: ['Explorer · Model', '长程探索 · 模型角色'], color: '#6aa8e8', hull: 0xdce8fa, eye: 0x8be9fd, trim: 0x6aa8e8 },
  { id: 'deepseek', name: 'DeepSeek V4 Pro', short: 'DeepSeek V4', role: ['Reasoner · Model', '深度推演 · 模型角色'], color: '#2dd4bf', hull: 0xe2f5f2, eye: 0x5eead4, trim: 0x2dd4bf },
  { id: 'qwen', name: 'Qwen3.7-Max', short: 'Qwen3.7-Max', role: ['Vanguard · Model', '全能先锋 · 模型角色'], color: '#e2667a', hull: 0xf9ebf0, eye: 0xff9eb5, trim: 0xe2667a },
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
