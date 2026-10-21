# InferenceNet 提交格式 v0.1.0

日期：2026-10-21。适用网页第 2 项 Benchmark、第 3 项 Agent / Harness、第 5 项 Failure Case。

本规范是第一版提交协议。2026-10-21 四个私有 HF Dataset 仓库已创建并上传规范与示例；自动受理和评测服务尚未部署。当前交付状态以 [Handoff](../handoffs/2026-10-21-submission-intake.md) 为准。三个示例只含合成数据。正式任务、模型、预算及评分规则由对应评测协议指定，不把示例参数当成 Dev100 的新协议。

## 1. 存到哪里

三类均使用 HF **Dataset repository** 保存完整文件包。Harness 仓也是 artifact 存储，不是模型权重仓；下载采用 Hub 文件 API，不要求能用 `datasets.load_dataset()` 解析。

| 网页入口 | submission.type | HF repo_id | 存储根目录 |
|---|---|---|---|
| 2 / Submit a benchmark | `benchmark` | `InferenceNet/benchmark-submissions` | `submissions/<submission_id>/v<version>/` |
| 3 / Submit an agent / harness | `harness` | `InferenceNet/harness-submissions` | 同上 |
| 5 / Submit a failure case | `failure_case` | `InferenceNet/failure-case-submissions` | 同上 |

三个提交仓和结果仓已创建，固定初始化 commit 见 [Handoff](../handoffs/2026-10-21-submission-intake.md#hf-storage)。三个提交仓在灰度期均为 private。版本从整数 `1` 起；补交用同一 submission_id 的 `v2/`，不改写已受理 v1。状态保存在登记系统，不靠移动目录或修改提交包表示“已通过”。

上传由入口后端/运营账号完成，外部提交者不需要整个组织仓库的写权限。公开 GitHub 只保存规范、模板与实现代码；完整 payload、受理回执、逐提交状态与原始日志归档到受控后端和私有 HF，不能写入公开 Issue、PR 或 Pages。公开榜单只接收经审核允许的字段。

**候选提交与官方版本分开。** 审核通过后，公开题目/允许的输入建议发布到 `InferenceNet/benchmarks`；隐藏评分材料放入单独受限的 `InferenceNet/benchmark-private`；原始评测结果建议保存到 `InferenceNet/evaluation-results`。其中 evaluation-results 已创建；benchmarks 与 benchmark-private 是后续正式发布/评分存储规划，未在本次创建，不增加用户提交入口。private 目录名不是访问控制；不能把隐藏答案与公开文件放在同一个公开仓。

## 2. 每一类都必须有的文件

```text
submissions/<submission_id>/v1/
├── submission.json       # 身份、类型、版本、专属配置入口、完整文件清单
├── README.md             # 人可以读懂的说明、使用方式、局限
├── LICENSE               # 代码/数据使用许可；混合来源需逐项说明
├── <type-specific>.json  # benchmark.json / harness.json / case.json
└── ...                   # 本类型的材料
```

通用 `submission.json` 必填字段：

| 字段 | 约束 |
|---|---|
| `schema_version` | 当前固定字符串 `0.1.0`；未知版本明确拒绝，不猜字段含义 |
| `type` | `benchmark`、`harness`、`failure_case` 三选一；必须与提交入口及目标仓一致 |
| `submission_id` | 小写 ASCII 字母、数字、连字符组成的唯一 ID；入口分配，不能仅凭用户自报覆盖别人提交 |
| `version` | 正整数，与目录 `v<version>` 一致 |
| `title` | 非空标题 |
| `submitter` | HF 用户名；生产入口根据认证身份记录，文件自报身份不算认证 |
| `license` | SPDX 标识或 `LicenseRef-...`；与 LICENSE 和各数据来源的许可一致 |
| `created_at` | UTC ISO 8601 时间，例如 `2026-10-21T00:00:00Z` |
| `spec_path` | 固定为该类型专属 JSON 文件名 |
| `files` | 除 submission.json 自身以外的**全部**文件，每项包含 `path`、`bytes`、`sha256` |

文件清单校验原始字节，sha256 为 64 位小写十六进制。README、LICENSE、代码、输入、参考答案、日志都要列入清单。submission.json 自身由受理回执记录 hash，避免自引用。不得出现未声明文件、重复文件、符号链接、绝对路径、反斜杠路径、`..`、远程动态脚本。v0.1 直接存文件，不接受由 Agent 自动解压执行的上传包。

JSON 使用 UTF-8，拒绝重复键、NaN/Infinity。所有路径相对当前提交包根目录，跨包依赖使用固定 artifact reference。平台另行限制总字节数/文件数；校验阶段不 import Python、不安装依赖、不运行提交脚本。

### 固定引用和回执

正式 HF 引用结构如下。尖括号是说明占位符，入口必须换成实际值，不能原样受理：

```json
{
  "transport": "hf",
  "repo_type": "dataset",
  "repo_id": "InferenceNet/harness-submissions",
  "revision": "<完整的40位HF Git commit SHA>",
  "path": "submissions/harness-example-001/v1",
  "submission_sha256": "<该目录submission.json原始字节的64位SHA256>"
}
```

禁止 `main`、`latest`、可移动 tag 和短 SHA。上传完成以后，入口生成独立的 `receipt.json`。以下是下载器所需的最小投影；完整归档回执还包含提交身份、校验状态及受理时间，以 [API 设计](API-DESIGN.md#44-状态与回执) 为准：

```json
{
  "schema_version": "0.1.0",
  "expected_type": "harness",
  "artifact": {"transport": "hf", "repo_type": "dataset", "repo_id": "InferenceNet/harness-submissions", "revision": "<实际commit>", "path": "submissions/harness-example-001/v1", "submission_sha256": "<实际sha256>"}
}
```

回执由受理系统从实际上传结果生成并可信保存；不把自己的 commit 写进同一提交包。后续 Agent 只消费可信回执。提交包已有的对其他包的依赖可以固定其他包先前的 commit。

本地示例的关联引用为 `{"transport":"local_fixture","path":"benchmark"}` 或 `harness`，相对于 examples 根目录。只有显式 `--allow-local-fixtures` 可接受；正式入口拒绝这种引用。它们不是伪造的远端 SHA，HF 真正上传后需重新填固定引用，再计算清单及回执。

## 3. Benchmark：提交可验证的任务包

```text
benchmark/
├── submission.json
├── README.md
├── LICENSE
├── benchmark.json
├── splits.json
├── provenance.json
└── tasks/
    └── toy-mean-001/
        ├── instruction.md
        ├── task.toml
        ├── environment/
        │   ├── Dockerfile
        │   └── data/input.json
        ├── solution/             # 只供 oracle 检查，不能挂到参赛环境
        │   ├── solve.sh
        │   └── ...
        └── tests/                # 只在独立 verifier 中可见
            ├── Dockerfile
            ├── test.sh
            ├── evaluate.py
            └── reference.json
```

本版选 Harbor task schema 1.4 和当前项目锁定的 Harbor 0.24.0 接口。任务路径一题一目录；不把全部任务打成 Agent 需要自行猜结构的压缩包。

| 必交材料 | 必须说明/包含 |
|---|---|
| `benchmark.json` | `format`、`benchmark_id`、`version`、完整 `task_ids`、`tasks_path`、`splits_path`、`metric_spec`、`runtime_profile`、`oracle_policy` |
| `splits.json` | `train`、`validation`、`sealed_test` 的明确任务 ID 列表，允许某列表为空；不重复、不交叠，合起来恰好等于完整任务集合 |
| `provenance.json` | 来源、授权、合成/真实数据声明、关联论文/数据标识；同一来源的任务提供 group_id，划分时防止同一来源跨训练/测试泄露 |
| `instruction.md` | Agent 能看到的任务目标、可用输入、交付文件位置、格式；不含隐藏答案 |
| `task.toml` | 任务身份、资源需求、输出 artifacts、环境与独立 verifier 配置 |
| `environment/` | 输入材料和可构建的环境定义；不用作者电脑绝对路径；构建上下文不能包含 solution/tests |
| `tests/` | 可执行评分器、参考答案或 rubric；错误状态与有效零分分开；评分期间不执行候选代码 |
| `solution/` | 可复现的 oracle/reference 解法。受理时检查 oracle 通过、空白/错误输出不被误判通过 |

`metric_spec` 必须规定指标名、范围、容差、方向、聚合方法和未评分处理。缺评分、服务故障、verifier 崩溃不能填零混入平均分。固定任务清单作为 coverage 分母；报 scored_count/expected_count，不能省略缺失项。

Agent 流程：文件校验 → task/split/provenance 检查 → 运行环境兼容性审核 → 隔离 oracle 与负例检查 → 可接纳为版本。**上传成功不等于成为官方 Benchmark。** 新 benchmark 的 schema 合格也不等于当前 Dev100 专用 driver 可直接运行它。

示例是计算 `[10, 0, 20]` 的算术平均值，正确输出 `{"mean":10}`，主指标 reward 为 0 或 1。答案只在 tests/ 与 oracle 中；测试时候选只拿 instruction 和 input。

## 4. Harness：提交可运行的实现

```text
harness/
├── submission.json
├── README.md
├── LICENSE
├── harness.json
├── src/submission_agent/
│   ├── __init__.py
│   ├── agent.py
│   └── solver.py
├── runtime/
│   └── ...                       # 精确依赖/运行环境声明
└── smoke/
    ├── input.json
    └── expected.json
```

| 必交材料 | 必须说明/包含 |
|---|---|
| `harness.json` | `interface`、`import_path`、`source_path`、`kwargs`、`runtime_lock_path`、`compatible_benchmark_releases`、`model_requirements`、`tool_policy` |
| `src/` | 实际源码，含可导入的 Harbor BaseAgent 类；仅提交论文、截图、成绩或一个浮动 GitHub 链接不够 |
| runtime lock | 固定第三方依赖、Python/系统要求、平台。若使用审核过的公共运行环境，声明 profile，最终具体镜像/rootfs/依赖 hash 由运营方冻结；不编造 digest |
| `smoke/` | 无隐藏测试数据的最小输入与预期产物，说明一条可以运行的验证命令 |
| README | 安装、运行入口、模型兼容性、工具需求、限制；如为改进版说明父版本和变化 |

运行协议使用 `harbor-base-agent-v0.24.0`。接入点为 `module:Class`，按当前 Harbor 的 `setup(environment)`、`run(instruction, environment, context)` 实现。SDK/CLI 类 Harness 可提供这一接口的适配层；本版不让调度 Agent 猜不同项目该执行哪个脚本。

正式运行配置由系统另建 `run-lock.json`：固定 benchmark/harness 引用、task/split、评测协议版本、模型/provider 与实际响应身份、有效生成参数、seed 支持情况、预算、attempt/retry 策略、运行环境与评分器 hash。提交者声明的是需求，不能在 kwargs 里放宽正式预算或替换官方评分器。

有 seed 就记录值、支持范围；无 seed 必须写 null 并说明，不声称确定性。HF token 只用于可信下载进程；候选环境拿不到 HF 凭据或评分材料。运行第三方 Harness 前要审查并使用独立 worker/受限模型代理；现有 host-side import 不能被当作对任意第三方 Harness 的安全隔离。

Agent 流程：静态校验 → 依赖/运行环境审查 → 独立 worker 内导入与 smoke → 按系统 run-lock 评测 → 输出新结果。这个阶段不接受 Harness 自报成绩替代独立评分。

示例是无外部模型调用的 Python 算术 Harness：correct 模式输出 10；ignore_zero_count 模式错误地用非零元素个数作分母，输出 15，供 Failure Case 示例引用。它只演示接口与数据流。

## 5. Failure Case：提交可复现的失败证据

```text
failure-case/
├── submission.json
├── README.md
├── LICENSE
├── case.json
├── reproduce.json
├── reproduce.md
└── evidence/
    ├── observed_run.json
    ├── run-lock.json
    ├── events.jsonl
    └── output/answer.json
```

| 必交材料 | 必须说明/包含 |
|---|---|
| `case.json` | `case_id`、固定 `benchmark_ref` / `harness_ref`、`task_id` / split、失败类别、实际观察、预期行为、机器可检查判据、证据路径 |
| `reproduce.json` | 模式、固定任务和运行参数、预算/attempt/seed 策略、失败判据及阈值来源；不能写“运行到失败为止” |
| `reproduce.md` | 人可读的步骤、已知前提与局限 |
| `evidence/observed_run.json` | 原始运行事实、协议/环境/模型身份、有效参数、终止原因、score 是否可用、verifier_error；未知留 null 并注明原因 |
| `evidence/run-lock.json` | `case.run_lock_path` 指向的运行锁，纳入文件 hash 清单；正式案例必须固定 benchmark/harness/protocol、实际 runtime/scorer hash、task/split、kwargs、预算/seed。必须与 observed_run 一致；缺失时保留为待补充案例，不能进入严格复现 |
| `evidence/output/` | 原始实际交付文件；没有输出时提交明确的缺失证明，不伪造空结果 |
| `evidence/events.jsonl` | 可定位问题的执行事件；声明来源与脱敏处理。更完整的请求/工具账本可补充，但不得含密钥 |

案例只有观察事实，并不自动证明根因。分类用 `task_failure`、`infrastructure_error`、`verifier_error`、`unresolved`；“模型问题/工具问题”的推断另存 hypothesis，避免把 provider 断连或鉴权失败当模型能力问题。

v0.1 的机器判据支持两种：`{"kind":"reward_below","metric":"reward","threshold":1}` 用于有效评分，threshold 必须与固定 benchmark 协议一致；`{"kind":"outcome_is","outcome_class":"infrastructure_error"}` 用于核验规范化终止类别，允许上述四类，不能拿自报 hypothesis 当运行器事实。observed 中有输出用 `output_path`；无输出用 `missing_output_evidence_path` 指向缺失证明，两者二选一。实际分类仍由运行器/核验器根据证据生成。

复现模式明确区分：

- `score_only`：对原始输出重新评分，确认原证据的失败判据；不等于重跑 Agent。
- `offline_replay`：用固定代码、输入和记录的离线条件重跑，不访问在线模型；本示例使用这一模式。
- `live_agent_rerun`：重新调用固定模型/Harness；保留所有 attempts，记录随机性。固定版本不保证模型每次输出相同。

只有按预定判据检查后才能标 `reproduced`。其他结果是 `not_reproduced`、`inconclusive` 或 `blocked`；缺材料不能算复现成功。不同模式单独记录结果，诊断重跑不覆盖原始 evidence。

参考答案、rubric、原始 verifier 详情与 sealed-test 信息只在评分侧。当前项目的部分 summary/reward-details 带 reference，不能原样注入被测 Agent 或公开。私有结果仓保存原件，公开报告按允许字段导出。

sealed-test 案例若经 owner 批准公开或用于修复 Harness，应在新版本中转为公开诊断/validation 任务，不再继续作为同一密封测试的独立成绩证据。细粒度数值误差也可能反推参考答案。

示例：错误 Harness 给出 15，正确均值为 10；原始证据标为 synthetic_fixture。校验工具实际运行以后，把新的验证事实写到包外 verification.json，不把合成记录冒充历史正式运行。

## 6. 统一 Agent 流程与返回值

```text
可信 receipt
  → 按 HF 完整 commit / path 下载
  → submission hash、完整文件清单、字节 hash 校验
  → type 专属检查
  → 运行环境审核 / 生成 run-lock
  → benchmark: oracle + 负例检查
    harness: smoke + 正式协议评测
    failure_case: 指定模式复现 + 失败判据检查
  → 新的私有结果记录 / 可发布字段导出
```

结果至少记录 `operation`、输入 artifact refs、`status`、错误类别、任务数/已评分数、可用分数或 null、环境与协议标识、输出文件 hash。失败不能只返回一个 false 而丢掉原因。

`validation_passed` 仅表示格式检查通过；`unsupported_runtime` 要停止调度并说明缺少的 profile；`verifier_error` / infrastructure error 不转成模型零分。评测使用新输出目录，拒绝覆盖原证据。

## 7. 本地工具与验证边界

以下命令相对于原始本地规范工具包，不是在本网站仓根目录执行。三个私有提交仓各含 `tools/validate_submission.py` 与本类 `examples/`；`fetch_submission.py`、`check_examples.py` 和测试尚未迁入本网站仓，也未随 HF 初始化上传。源文件位置和已验证边界见 [Handoff](../handoffs/2026-10-21-submission-intake.md#local-artifacts)。

```powershell
python tools/validate_submission.py examples/benchmark
python tools/validate_submission.py examples/harness
python tools/validate_submission.py examples/failure-case --allow-local-fixtures
python tools/check_examples.py --output verification.json
```

`validate_submission.py` 只做静态结构、引用和完整性检查，不执行上传代码。`check_examples.py` 只运行本包中已知的合成示例，验证正确输出、错误输出、评分和失败复现；它不是通用的不可信代码执行器，也没有宣称实现生产隔离。

示例 runtime-lock 是环境需求，不是完整运行冻结证据：镜像 digest/实际安装清单待运营方提供。verification 将本机 `execution_mode=local_fixture` 与 `harbor_integration=not_run` 分开记录。格式通过不代表 Docker/Harbor 集成已通过。

将来已获得真实回执后，可以使用：

```powershell
python tools/fetch_submission.py receipt.json --dest work/submission
```

下载工具使用受信任环境中的 HF 登录凭据，下载固定 commit，拷贝到新目录后执行静态校验。它不创建仓库、不上传、不启动正式评测。

尚需接入服务的部分：网页三入口、受理身份/上传与回执、运行环境审批、外部 Harness worker、通用任务调度、结果发布。当前 Dev100 专用 driver 的固定任务限制不应删除来“兼容”新包；为审核通过的新 benchmark 配置独立适配和协议。

## 依据

- HF 指定 revision 下载：https://huggingface.co/docs/huggingface_hub/guides/download
- HF repository 可见性：https://huggingface.co/docs/hub/repositories-settings
- Harbor 任务组成：https://docs.harborframework.com/tasks/overview
- 本项目版本与运行约束：相邻 `inferencenet-harbor` 项目的 `AGENTS.md`、`notes/decisions.md`、`adapters/econometrics/build_tasks.py`、`scripts/dev100_campaign.py`。接口以本项目锁定的 0.24.0 源码为准，不把不断变化的在线文档当锁文件。
