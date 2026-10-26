/** The project taxonomy supplied on 2026-10-26: three directions, sixteen directories.
 * Directory membership is distinct from benchmark availability or measured results. */
export const HARNESS_NAMES = Object.freeze([
  'DeepSeek Harness', 'DeepAgents', 'Claude Code', 'Codex CLI', 'OpenCode',
  'OpenHands SDK', 'Terminus-2', 'mini-SWE-agent',
]);
export const ARENA_DOMAINS = Object.freeze([
  {
    id: 'econ', name: ['Economics', '经济'], color: 0x45b5b0,
    summary: ['From empirical evidence to economic understanding.', '从实证证据出发，理解经济运行。'],
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
    entries: [
      { id: 'soc.law', name: ['Law & regulation', '法律与监管'], description: ['Apply legal provisions, review compliance boundaries and reason over cases and judgments.', '法条适用、合规边界审查、法律推理与案例裁量。'] },
      { id: 'soc.hr', name: ['People & organizational analysis', '人力资源与组织分析'], description: ['Diagnose organizations, calculate compensation and performance, schedule work and propose policies.', '组织诊断、薪酬绩效核算、工时排程与制度建议。'] },
      { id: 'soc.business', name: ['Business operations & CRM', '商业运营与客户管理'], description: ['Analyze business processes, manage customer lifecycles and interpret CRM operating metrics.', '业务流程分析、客户生命周期管理、CRM 运营指标。'] },
      { id: 'soc.society', name: ['Society, education & survey data', '社会、教育与调查数据'], description: ['Interpret survey, population and education data and aggregate heterogeneous tables.', '社会调查与人口教育数据语义理解、异构表聚合。'] },
      { id: 'soc.psychology', name: ['Psychology & cognitive science', '心理与认知科学'], description: ['Analyze behavioral and cognitive experiments, perform statistical tests and scientific computing.', '行为与认知实验数据分析、统计检验与科学计算。'] },
    ],
  },
]);
