# 当前自有服务器提交 API（2026-10-22）

本页定义 `submit.inferencenet.cn` 的现行受理合同。它替代旧 API-DESIGN 中的 HF 登录、HF 主存储、跨仓回执及异步归档部分；材料结构和类型专属静态约束继续参考 SPEC。服务实现位于 `submission_service/`。

## 身份与页面

三个页面固定为 `/submit/benchmark/`、`/submit/harness/`、`/submit/failure-case/`，记录页为 `/submit/mine/`。共用 v2 设计变量、中英文、深浅主题、注册和上传组件。

用户确认采用用户名＋密码注册/登录，不依赖邮件或 HF。用户名 3–32 个 ASCII 字母/数字/下划线/连字符，忽略大小写；密码 12–128 个字符，以 scrypt 哈希保存。所有权绑定不可变的系统 `user-...` ID；manifest 的 submitter 由服务端填该 ID，不采用文件中的自报身份。

七天会话使用 `__Host-inferencenet-session` Secure/HttpOnly/SameSite=Lax Cookie；数据库只保存随机会话令牌的 SHA256。所有写请求要求同源 Origin，除注册/登录外还要求 `X-CSRF-Token`。他人提交返回 404，匿名访问需要登录。不提供未经验证的邮箱身份，也未实现邮件找回。

## 接口

| Method / Path | 用途 |
|---|---|
| GET `/api/v1/session` | 当前账号、CSRF 和单包额度 |
| POST `/api/v1/auth/register` | `{username,password}`，创建账号与会话 |
| POST `/api/v1/auth/login` | `{username,password}`，创建会话 |
| POST `/api/v1/auth/logout` | `{}`，撤销当前会话 |
| POST `/api/v1/submissions/{type}/init` | 冻结新提交的标题、许可和文件清单 |
| POST `/api/v1/submissions/{id}/versions/init` | 同一作品追加版本，所有者限定 |
| PUT `/api/v1/uploads/{upload_id}/files/{file_id}` | 原始字节流，核验 bytes/SHA256 |
| POST `/api/v1/uploads/{upload_id}/complete` | 同步静态校验和封存，返回 200 或 422 |
| GET `/api/v1/submissions?cursor=0` | 本人版本列表，每页 50 条 |
| GET `/api/v1/submissions/{id}/versions/{version}` | 文件状态、上传 ID、错误和回执可用性 |
| GET `/api/v1/submissions/{id}/versions/{version}/receipt` | 本人回执附件，未就绪 409 |
| GET `/api/v1/templates/{type}` | 已登录用户取得合成示例文本 |

type 为 `benchmark`、`harness`、`failure_case`。init 的请求字段为 `{schema_version,title,license,files}`，其中 files 为 `{path,bytes,sha256}` 数组，不含 submission.json。init 与 complete 要求 12–128 位 ASCII 的 `Idempotency-Key`。init 同键同请求返回原上传，不同请求 409；complete 无论换键或重试都只封存同一 upload 一次。

文件夹导入时保留相对路径，已有 submission.json 只用作元数据模板，不作为 payload 上传。服务端生成最终 manifest；已验证字节不可被不同内容覆盖。断网后重新选择原文件夹即可重传，已经验证的文件会跳过。“我的提交”的继续入口可在新浏览器会话中恢复同一 upload，要求原始标题、许可和清单一致。

状态为 `uploading → validating → awaiting_review`，或 `validation_failed` / `expired`。同步 complete 使用跨进程文件锁串行化同一提交，数据库事务冻结状态。manifest 原始字节固定，包以同文件系统原子 rename 发布；崩溃后相同 complete 能从已有 sealed 包恢复，不创建新版本。回执原子写入，数据库在同一受控阶段最终记录；已落盘但 DB 未记录的固定版本也可重试恢复。

## 存储与固定引用

用户确认使用现有系统盘：完整包位于 `/srv/inferencenet-submit/data/submissions/<id>/v<version>/`，回执位于 `data/receipts/<id>/v<version>.json`，数据库位于 `data/intake.sqlite3`。暂存位于 `/srv/inferencenet-submit/staging`。这些路径不由客户端指定，也不作为 Web 静态目录发布。

回执示意：

```json
{
  "schema_version": "0.1.0",
  "submission_id": "harness-EXAMPLE",
  "version": 1,
  "type": "harness",
  "expected_type": "harness",
  "validation": {"status": "passed"},
  "accepted_at": "<实际封存的UTC时间>",
  "artifact": {
    "transport": "server",
    "submission_id": "harness-EXAMPLE",
    "version": 1,
    "submission_sha256": "<manifest原始字节的64位SHA256>"
  }
}
```

Failure Case 的 benchmark_ref/harness_ref 和 run-lock 引用必须对应当前账号已受理记录中的上述 artifact 对象。服务核对类型、版本、manifest 哈希与任务/split；不能引用他人的私有材料或任意服务器路径。HF / local_fixture 引用不进入现行生产受理流程。HF 作为未来可选归档，需要另行接入。

合成示例保持 `evidence_kind=synthetic_fixture`、`verification_status=not_run`、未知 score/runtime=null。由模板入口明确标记 `synthetic_demo=true` 的演示案例可保留未解析 runtime，不宣称真实运行已验证。普通 Failure Case 仍须提供实际运行环境哈希。载入示例会引用本人最新 Benchmark/Harness，只有任务与 split 对应时才通过；应先提交配套的两个合成示例。

## 边界与验收

回执表示私下存储和静态检查通过；所有版本仍为待人工审核，不代表官方接纳、评测完成或失败复现。当前没有批准运行接口或自动队列，上传不执行任何脚本、导入候选源码、安装候选依赖或解压用户压缩包。

单包 1 GiB / 2,000 文件；每账号保留 5 GiB / 10,000 文件，全局 100 GiB / 200,000 文件，并保留 5 GiB 可用空间。JSON/TOML 总量最多 32 MiB，单文档 4 MiB，JSONL 每行 1 MiB。登录/注册/init 有限流，上传每账号最多 3 个活动文件。上传 24 小时后过期，清理等待最大写入租约结束；已受理包不被清理。

源码带有三类受理、所有权、CSRF/Origin、危险路径、坏哈希与重传、重复 init/complete、新版保留旧版、归档中断恢复和不执行上传代码的测试。部署后应再次走通三类提交，核对服务器 payload/manifest 哈希、回执、重启后会话与文件状态，以及带数据库快照的备份。
