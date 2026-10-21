# InferenceNet 提交入口与最小 API 设计

版本：v0.1，2026-10-21。交付状态见 [Handoff](../handoffs/2026-10-21-submission-intake.md)。本文是可用于实现的接口约定，不代表页面、登录服务或评测队列已经上线。文件包内容继续遵循 [SPEC.md](SPEC.md)。

**采用三个提交页面、一套表单组件、一个受理后端。** Benchmark、Agent / Harness、Failure Case 各有明确的入口和专属字段，登录、文件上传、校验、回执与状态查询共用服务。第四个 HF 仓 `InferenceNet/evaluation-results` 只保存系统回执与运行结果，不产生第四个用户提交入口。

## 1. 页面与服务的边界

现网站是 GitHub Pages 静态站点，依据 [网站 README](../../README.md)。现有第 2、3、5 张卡片分别通向 Contact、Harness 介绍、Contact，依据 [首页卡片](../../index.html) 与 [Challenge 页卡片](../../challenge.html)。创建 HF 仓和上传规范不会自动建立这些提交页面或后端。

灰度版建议由独立的提交服务同时提供静态表单页和 `/api/v1/`，两者使用同一 origin。现有 GitHub Pages 只需把对应按钮链接到以下页面，网站其他内容继续在原处发布。`SUBMIT_ORIGIN` 是部署配置，实际域名在部署时确定。

| 网站入口 | 提交服务页面路由 | 后端固定 type | 表单专属内容 |
|---|---|---|---|
| 2 / Submit a benchmark | `SUBMIT_ORIGIN/submit/benchmark/` | `benchmark` | 任务包、split、指标、来源授权、oracle 与 verifier |
| 3 / Submit an agent / harness | `SUBMIT_ORIGIN/submit/harness/` | `harness` | 代码、Harbor 接口、运行环境要求、模型/工具要求、smoke |
| 5 / Submit a failure case | `SUBMIT_ORIGIN/submit/failure-case/` | `failure_case` | 固定 benchmark/harness 引用、任务、观察证据、run lock、复现方式 |

三页使用同一表单组件，根据固定路由配置加载对应说明、模板和字段。用户流程统一为“登录 → 填写与选择文件 → 检查清单 → 上传并确认提交 → 查看状态”。第 1 项 Explore 保留浏览入口。第 4、6 项的合作入口不在本次三类提交协议内。

采用提交页与 API 同源，可以直接使用服务端会话，避免让 GitHub Pages 到另一站点的跨站 Cookie 成为灰度版本的前提。若后续要求表单本身也留在 GitHub Pages，需要另行配置明确的跨源白名单并验证浏览器的凭据策略；CORS 本身不代替认证、授权或 CSRF 防护。浏览器跨源机制见 [MDN CORS 文档](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)。

## 2. 固定存储映射

映射来自服务端配置，和本地原型 `fetch_submission.py` 的 `REPOSITORIES`（未纳入本网站仓，位置见 [Handoff](../handoffs/2026-10-21-submission-intake.md#local-artifacts)） 一致。请求体不能选择 `repo_id`、仓库可见性或任意目标路径。

| 用途 | HF Dataset repo | 写入路径 | 谁可写 |
|---|---|---|---|
| Benchmark 文件包 | `InferenceNet/benchmark-submissions` | `submissions/<submission_id>/v<version>/` | 受理服务 |
| Harness 文件包 | `InferenceNet/harness-submissions` | 同上 | 受理服务 |
| Failure Case 文件包 | `InferenceNet/failure-case-submissions` | 同上 | 受理服务 |
| 受理回执、验证报告 | `InferenceNet/evaluation-results` | `receipts/<submission_id>/v<version>/receipt.json`，同目录 `validation.json` | 受理服务 |
| 运行锁、评测结果、产物与日志 | `InferenceNet/evaluation-results` | `runs/<run_id>/run-lock.json`、`results.json`、`artifacts/` | 可信调度/结果服务 |

四仓保持 private。提交者通过受理服务访问自己的记录，不获得任何共享仓的写权限或仓级读取凭据。HF 操作使用后端受控凭据，与提交者用于登录的身份凭据分开。

服务端数据库记录 owner、上传状态、幂等记录、版本号、作业状态和 HF 固定引用；回执、验证报告、运行锁与结果以不可改写版本归档到 `evaluation-results`。数据库作为查询与队列索引，HF 作为文件与审计产物归档。**这些私有回执、原始日志和状态索引不写入公开 GitHub Issue、PR 或 Pages 仓。** 后续公开榜单仅接收经过审核的允许字段。

## 3. 登录与所有权

使用 HF OAuth / OpenID Connect 登录，申请 `openid profile` 即可完成身份识别，不向提交者请求组织仓的写权限。HF 官方支持在普通网站中使用该登录流程，见 [Sign in with Hugging Face](https://huggingface.co/docs/hub/oauth)。

- `GET /auth/login?return_to=/submit/harness/`：服务端发起授权流程，`return_to` 只接受本站允许的相对路径。
- `GET /auth/callback`：校验 state、PKCE 与身份令牌后创建会话；OAuth 客户端信息与回调地址由部署配置提供。
- `GET /api/v1/session`：返回当前用户的 HF 用户名、可提交类型、灰度额度和 CSRF token；不返回 HF token。
- `POST /auth/logout`：撤销本站会话。

本站会话使用 host-only、HttpOnly、Secure、SameSite=Lax Cookie。写接口校验 CSRF token 和请求来源。数据库所有权绑定经验证的稳定身份 `issuer + subject`，不以可变用户名或请求体里的 `submitter` 作为授权依据。最终 `submission.json.submitter` 由服务端填写已验证的 HF 用户名。

灰度用户还需通过后端 allowlist。知道某个 submission ID、file ID 或 job ID，不产生访问权。读取他人记录统一返回 404；运营角色通过单独的授权检查访问管理接口。

## 4. 最小接口清单

除登录外，以下接口均要求有效会话。JSON 请求使用严格 JSON 解析；每个写接口拒绝未定义字段，防止客户端混入 `repo_id`、`submitter`、`run_now` 或自定义执行命令。

| Method / Path | 作用 | 正常响应 |
|---|---|---|
| `POST /api/v1/submissions/{type}/init` | 分配新 submission ID 和 v1，冻结本次文件清单 | 201 |
| `POST /api/v1/submissions/{id}/versions/init` | 所有者补交新版本；type 从原记录读取 | 201 |
| `PUT /api/v1/uploads/{upload_id}/files/{file_id}` | 上传清单内一个文件的原始字节 | 204 |
| `POST /api/v1/uploads/{upload_id}/complete` | 封存上传，排入静态校验与归档队列 | 202 |
| `GET /api/v1/submissions/{id}/versions/{version}` | 查询本人提交、文件与后续作业状态 | 200 |
| `GET /api/v1/submissions?cursor=...` | 分页列出本人的提交 | 200 |
| `GET /api/v1/submissions/{id}/versions/{version}/receipt` | 取得本人已归档的可信回执 | 200；未就绪 409 |
| `POST /api/v1/admin/submissions/{id}/versions/{version}/approve-job` | 运营审核后批准指定运行 | 202 |

`{type}` 只接受 `benchmark`、`harness`、`failure_case`；页面的 `failure-case` 映射成 API 的 `failure_case`。不存在第四种提交 type。

### 4.1 初始化

```http
POST /api/v1/submissions/harness/init
Content-Type: application/json
Idempotency-Key: <本次初始化的随机唯一键>
X-CSRF-Token: <会话提供的token>
```

以下是展示字段的节选；实际 `files` 必须包含该包全部 payload 文件，不能只提交这两个文件：

```json
{
  "schema_version": "0.1.0",
  "title": "Example arithmetic harness",
  "license": "MIT",
  "files": [
    {"path": "harness.json", "bytes": 1200, "sha256": "<实际64位小写sha256>"},
    {"path": "src/submission_agent/agent.py", "bytes": 3400, "sha256": "<实际64位小写sha256>"}
  ]
}
```

这里及后文的尖括号值都是说明占位符，不能原样提交。文件数、单文件大小和总字节数由服务端配额控制；默认总声明字节上限建议与现有下载器一致为 1 GiB，manifest 上限为 4 MiB。实际 HTTP 上传也必须执行流式字节上限，不能仅相信 `bytes` 或 Content-Length。

初始化响应包含最终身份元数据和每个文件的 opaque ID：

```json
{
  "submission_id": "harness-01-example",
  "version": 1,
  "type": "harness",
  "upload_id": "upl_example",
  "state": "uploading",
  "expires_at": "<UTC ISO timestamp>",
  "manifest_metadata": {
    "schema_version": "0.1.0",
    "submitter": "<已认证HF用户名>",
    "created_at": "<服务端UTC ISO timestamp>",
    "spec_path": "harness.json"
  },
  "files": [
    {"file_id": "file_001", "path": "harness.json", "state": "pending"},
    {"file_id": "file_002", "path": "src/submission_agent/agent.py", "state": "pending"}
  ]
}
```

提交 ID、version、submitter、created_at、type、spec_path 都由服务端分配或推导。新版本分配在数据库事务中完成，检查相同 owner 和 type，并用 `(submission_id, version)` 唯一约束防止覆盖或并发撞号。已封存的版本不可重开；修改材料创建新版本。

表单允许导入本地示例目录，把原 `submission.json` 当作模板读取并核对清单；界面明确展示服务端分配的新身份。上传文件列表不包含 `submission.json` 本身，后端用已冻结的身份元数据和实际校验的 files 生成最终 manifest。前端不能静默保留模板中的其他人身份，后端也不能接受用户通过额外上传替换 manifest。

### 4.2 上传单文件

```http
PUT /api/v1/uploads/upl_example/files/file_001
Content-Type: application/octet-stream
X-CSRF-Token: <会话提供的token>

<harness.json的原始UTF-8字节>
```

上传目标由 `(upload_id, file_id)` 查数据库得到，客户端不能通过 URL 携带任意文件系统路径。接收进程把字节流写到受限的临时存储，同时计算 bytes/SHA256；与初始化清单一致才把文件状态设为 `verified`。不解压，不改换行，不重新序列化 JSON，不安装依赖或执行上传代码。

同一 file ID 的相同字节可安全重传并返回 204；不同字节或不同声明返回 409/422，不覆盖已验证文件。上传对象过期返回 410。`complete` 与文件写入使用数据库状态锁，封存以后拒绝仍在途的写入，避免校验和归档取到不同版本的文件。

灰度版采用后端接收原始文件即可；暂不增加浏览器直传 HF、用户 PAT 或额外的 multipart 协议。持久临时目录、每用户额度、过期回收和并发数均是部署配置。

### 4.3 完成上传

```http
POST /api/v1/uploads/upl_example/complete
Content-Type: application/json
Idempotency-Key: <本次complete的随机唯一键>
X-CSRF-Token: <会话提供的token>

{}
```

```json
{
  "submission_id": "harness-01-example",
  "version": 1,
  "state": "validating",
  "status_url": "/api/v1/submissions/harness-01-example/versions/1",
  "execution_state": "not_requested"
}
```

202 只表示已封存且校验工作已持久登记。服务端在同一数据库事务中写入状态与队列/outbox 记录，随后由可信 worker 执行：

1. 确认所有声明文件都已验证，并核对最终清单没有额外或缺失文件；生成 `submission.json` 的稳定原始字节。
2. 调用 HF 初始化仓中的 `tools/validate_submission.py`（取得方式见 [Handoff](../handoffs/2026-10-21-submission-intake.md#hf-storage)） 做通用与 type 专属静态检查。正式受理不传 `--allow-local-fixtures`。本阶段不运行 `check_examples.py`，也不 import Harness。
3. 补充跨引用检查：从可信已受理记录解析 benchmark/harness，验证引用类型、固定 commit、manifest hash、访问权限、task/split 和运行锁的一致性。禁止用 API 读取别人私有提交；可选依赖来自该用户有权使用的已发布/已授权版本。
4. 按固定目标 repo/path 上传已封存包，记录 HF 返回的完整 commit。相同目标前缀只允许创建一次；若重试发现既有内容，必须比对 manifest 和 payload hash，不能覆盖不同内容。
5. 用实际 commit 和 manifest hash 生成固定 `receipt.json`，连同验证报告归档到 private `evaluation-results`；保存归档的完整 commit 和路径。
6. 回执归档完成后才进入 `awaiting_review`，允许用户取得回执。

这两个 HF 仓的写入不是跨仓事务。若文件包已提交但回执归档失败，保留 `archiving_receipt` 状态和已知 commit，用同一份回执字节重试；不能把整个流程误判失败后再创建一份提交。网络返回不明时先核对既有路径/hash，再决定重试。

### 4.4 状态与回执

```json
{
  "submission_id": "harness-01-example",
  "version": 1,
  "type": "harness",
  "state": "awaiting_review",
  "validation": {"status": "passed", "errors": []},
  "receipt_available": true,
  "execution": {"status": "not_approved", "job_id": null, "run_id": null},
  "updated_at": "<UTC ISO timestamp>"
}
```

回执 API 返回完整归档结构，并保留既有下载工具使用的 `expected_type` 和 `artifact` 字段。以下仍是结构示意，`accepted_at` 等占位值不是已经发生的受理事实：

```json
{
  "schema_version": "0.1.0",
  "submission_id": "harness-01-example",
  "type": "harness",
  "version": 1,
  "expected_type": "harness",
  "validation": {"status": "passed"},
  "accepted_at": "<系统实际受理时的UTC ISO timestamp>",
  "artifact": {
    "transport": "hf",
    "repo_type": "dataset",
    "repo_id": "InferenceNet/harness-submissions",
    "revision": "<实际40位commit SHA>",
    "path": "submissions/harness-01-example/v1",
    "submission_sha256": "<实际submission.json原始字节的64位sha256>"
  }
}
```

`type` 与 `expected_type` 必须相同；回执的 submission_id、type、version 必须与固定 artifact 中的 manifest 一致，且 artifact.path 必须恰好对应 `submissions/<submission_id>/v<version>/`。validation.status 来自系统实际校验结果，accepted_at 由受理系统记录，不能采用提交者自报时间或示例占位值。

服务端从已归档的可信回执提供此响应；不接受提交者上传同名 receipt 来证明自己的包已经受理。回执自身的归档 commit 存数据库引用中，不写进同一文件造成自引用。

状态 API 可用 ETag 与 `Retry-After` 指示轮询间隔。返回本人可见的格式错误、审核状态与结果摘要，不直接返回 private repo 的文件列表、内部绝对路径、凭据或原始含答案的 verifier 日志。

## 5. 状态与幂等规则

受理状态与执行状态分开保存。`awaiting_review` 表示格式和存储受理完成，尚不代表官方 benchmark 接纳、评测通过或论文结论成立。

```text
uploading
  ├─ expired
  └─ validating
       ├─ validation_failed
       └─ storing_artifact → archiving_receipt → awaiting_review

execution: not_approved → approved → queued → running
                                      └────→ blocked / completed / failed
```

存储暂时故障保留所在阶段和可重试错误，不用新的 ID 隐藏故障。校验失败的版本仍保存失败原因；用户修改后初始化下一版本。运行的 infrastructure/verifier 故障使用明确错误类别和不可用分数，不能自动转成模型零分。

所有提交、版本初始化、complete 和 approve-job 的 POST 写操作要求 `Idempotency-Key`；注销只需会话与 CSRF 校验。服务端以 `(owner_subject, operation, key)` 唯一约束保存规范化请求摘要和已产生的 ID/响应：同 key 同请求返回原结果，同 key 不同请求返回 409。初始化成功后，即使前端因断网重复点击，也不能额外分配 ID 或版本。幂等记录至少保留到该上传/作业完成及客户端重试窗口结束；上传会话存续期间不得提前清除。

文件 PUT 天然以 upload/file ID 幂等；`complete` 还以 upload ID 唯一封存，即使客户端误用了新幂等键也不能重复入队。队列消费可以重试，但发布提交、归档回执和批准作业都由唯一约束与状态比较控制副作用。

## 6. 运行需要独立批准

`complete` 永远不执行第三方 Harness、安装依赖、构建 Docker 或调用在线模型。Benchmark 的 oracle/verifier 和 Failure Case 的复现也可能执行提交代码，均须经过运行审核。

运营批准接口的示意请求：

```http
POST /api/v1/admin/submissions/harness-01-example/versions/1/approve-job
Content-Type: application/json
Idempotency-Key: <运营操作的唯一键>
```

```json
{
  "operation": "harness_smoke_then_evaluate",
  "protocol_id": "<审核通过的协议版本>",
  "runtime_profile_id": "<可用且已冻结的环境版本>",
  "review_record_id": "<该固定artifact对应的审核记录>"
}
```

后端依据 submission type 限制 operation：Benchmark 使用 `benchmark_oracle_check`，Harness 使用 `harness_smoke_then_evaluate`，Failure Case 使用 `failure_reproduction`。普通用户不能调用该接口；也不能通过 kwargs 选择评分器、读取隐藏答案或放宽系统预算。

`job_id` 是队列作业 ID；`run_id` 是不可改写运行归档的 ID，仓内路径一律使用 run_id。数据库保存两者映射；同一作业的基础设施重试不改写已归档运行，实际发起新的运行时分配新的 run_id。

批准时锁定已审核的 artifact commit/hash、协议、task/split、预算、模型身份和运行环境，生成新的正式 run-lock，归档到 `evaluation-results/runs/<run_id>/run-lock.json` 后再排执行任务。运行结果写入同目录 `results.json`，产物和受限日志放入 `artifacts/`。运行锁存在未解析 runtime/scorer hash、依赖审核未完成或无可用 worker 时返回/记录 `blocked`，不把示例需求声明当成已部署环境。

可信下载/编排进程持有 HF 凭据；不可信执行 worker 不继承这些凭据。执行环境与 verifier、参考答案、结果归档写权限分离。现有 Harbor 的 host-side 导入接口本身不构成任意第三方代码的隔离，部署须落实独立 worker 与明确的访问限制。

审核批准绑定具体版本和 hash。上传 v2 不继承 v1 的代码批准。自动评测 Agent 消费受控队列中的可信回执和运行锁，不扫描 HF 后直接执行刚出现的新目录。

## 7. 错误、落地范围与验收

API 错误统一为 `{ "error": { "code": "...", "message": "...", "fields": [...] }, "request_id": "..." }`。例如 400 非法请求、401 未登录、403 CSRF/角色拒绝、404 不存在或无权读取、409 状态/幂等冲突、410 上传过期、413 超额、422 格式或 hash 不符、429 限流、503 暂时不可用。返回可操作的错误，不暴露私有服务的原始异常 URL 或 traceback。

最小可部署组件是一个提供表单和 API 的服务、一个持久数据库、受配额约束的持久上传暂存区，以及消费数据库任务的校验/归档 worker。运行第三方代码的执行 worker 是后续独立部署单元，不能与有 HF 写凭据的 API 进程合并。

上线前应验证：三入口固定路由到正确 repo；匿名和他人无法读写；重复 init/complete 不重复创建；断网可重传同一文件；大小/hash/JSON/path/split 校验失败有明确错误；HF 提交成功但响应丢失能恢复原 commit；回执失败可重试；正式入口拒绝 local_fixture；complete 不触发代码执行；未审批或运行环境未冻结的作业不会启动。

本文仅确定接口和部署边界，不创建生产页面、OAuth app、数据库、网络服务或自动评测任务。现成的格式验证与下载函数可以复用；会话、配额、持久状态、并发/幂等和作业审核仍需要后端实现。
