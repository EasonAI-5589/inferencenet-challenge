import { hashFile } from "./sha256.js?v=20261022-intake";
const $ = (id) => document.getElementById(id);
const route = location.pathname.split("/")[2] || "benchmark";
const kind = route.replace("failure-case", "failure_case");
let language = "en",
  user = null,
  csrf = null,
  files = [],
  busy = false,
  registering = false,
  receipt = null,
  nextCursor = null,
  sessionReady = Promise.resolve();
try {
  language =
    localStorage.getItem("inferencenet-language") === "zh" ? "zh" : "en";
} catch {}
const t = (en, zh) => (language === "zh" ? zh : en);
const definitions = {
  benchmark: {
    title: ["Submit a benchmark", "提交 Benchmark"],
    description: [
      "Bring a real domain problem, a reproducible environment and an independent way to measure success.",
      "带来一个真实领域问题、可复现的环境，以及独立衡量结果的方法。",
    ],
    guide: ["A task worth solving", "一个值得解决的任务"],
    intro: [
      "Package the task, its data and the evidence needed to verify a solution.",
      "将任务、数据和验证解答所需的材料放进同一份提交包。",
    ],
    requirements: [
      ["Task instructions and environment", "任务说明与运行环境"],
      [
        "Disjoint train / validation / sealed-test splits",
        "互不重叠的数据划分",
      ],
      ["Oracle solution and independent verifier", "参考解法与独立评分器"],
      ["Data provenance, license and a smoke test", "数据来源、许可和最小测试"],
    ],
    tree: "benchmark.json\nREADME.md · LICENSE\nprovenance.json · splits.json\nsmoke/\ntasks/\n  └─ task-id/\n     ├─ instruction.md · task.toml\n     ├─ environment/\n     ├─ solution/\n     └─ tests/",
  },
  harness: {
    title: ["Submit an agent / harness", "提交 Agent / Harness"],
    description: [
      "Share the system that turns a model into an agent: its tools, control flow and a reproducible starting point.",
      "分享让模型成为智能体的系统：工具、控制流程，以及可复现的起点。",
    ],
    guide: ["A system others can build on", "一套可供他人继续构建的系统"],
    intro: [
      "Keep your source layout. Describe how to load it and what it needs to run.",
      "保留现有源码布局，并说明如何接入、运行需要什么。",
    ],
    requirements: [
      [
        "Source code and a module:Class entry point",
        "源码与 module:Class 入口",
      ],
      ["Pinned runtime and dependency requirements", "固定的运行环境与依赖"],
      ["Model, tool and benchmark compatibility", "模型、工具与任务兼容性"],
      ["Minimal smoke input and expected output", "最小测试输入与预期输出"],
    ],
    tree: "harness.json\nREADME.md · LICENSE\nsrc/\n  └─ your_agent/\nruntime/\n  └─ runtime-lock.json\nsmoke/\n  ├─ input.json\n  └─ expected.json",
  },
  failure_case: {
    title: ["Submit a failure case", "提交 Failure Case"],
    description: [
      "Make a failure useful. Share the fixed versions, original evidence and a precise way to reproduce what happened.",
      "让失败成为有用的证据。提供固定版本、原始记录，以及准确的复现方式。",
    ],
    guide: ["Evidence we can follow", "一条可以追溯的证据链"],
    intro: [
      "Reference accepted benchmark and harness receipts from your account. Keep unavailable scores explicitly unavailable.",
      "引用你账号下已受理的 Benchmark 和 Harness 回执。不可用的分数应明确标为不可用。",
    ],
    requirements: [
      [
        "Fixed benchmark and harness receipt references",
        "固定的任务与 Harness 回执引用",
      ],
      ["Task ID, split and original run lock", "任务 ID、划分与原始运行锁"],
      [
        "Observed outputs and unedited event evidence",
        "实际输出与原始事件证据",
      ],
      ["Reproduction mode and a failure criterion", "复现方式与失败判据"],
    ],
    tree: "case.json\nREADME.md · LICENSE\nreproduce.json · reproduce.md\nevidence/\n  ├─ run-lock.json\n  ├─ observed_run.json\n  ├─ events.jsonl\n  └─ output/",
  },
  mine: {
    title: ["My submissions", "我的提交"],
    description: [
      "Follow your contributions from upload to private review. Every accepted version has its own receipt.",
      "追踪从上传到私下审核的每份贡献。每个已受理版本都有独立回执。",
    ],
  },
};
const definition = definitions[kind];
const bytes = (value) =>
  value >= 1073741824
    ? (value / 1073741824).toFixed(2) + " GiB"
    : value >= 1048576
      ? (value / 1048576).toFixed(1) + " MiB"
      : value >= 1024
        ? (value / 1024).toFixed(1) + " KiB"
        : value + " B";
const messages = {
  "Please sign in to continue.": [
    "Please sign in to continue.",
    "请先登录后继续。",
  ],
  "Username or password is incorrect.": [
    "Username or password is incorrect.",
    "用户名或密码不正确。",
  ],
  "This username is already registered.": [
    "This username is already registered.",
    "这个用户名已经注册。",
  ],
  "Use a password with 12–128 characters.": [
    "Use a password with 12–128 characters.",
    "密码长度需为 12–128 个字符。",
  ],
  "Submit the benchmark and harness examples first, then load this linked failure-case example.":
    [
      "Submit the benchmark and harness examples first, then load this linked failure-case example.",
      "请先提交 Benchmark 和 Harness 的合成示例，再载入自动关联回执的 Failure Case 示例。",
    ],
  "Too many requests. Please try again later.": [
    "Too many requests. Please try again later.",
    "操作过于频繁，请稍后再试。",
  ],
};
function translatedError(error) {
  return messages[error.message]
    ? t(...messages[error.message])
    : error.message;
}
function notice(message, error = false) {
  $("notice").textContent = message;
  $("notice").classList.toggle("error", error);
  $("notice").hidden = !message;
  if (message)
    $("notice").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function translate() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-en][data-zh]").forEach((node) => {
    node.textContent = node.dataset[language];
  });
  $("language").textContent = language === "zh" ? "EN" : "中文";
  $("page-title").replaceChildren(
    document.createTextNode(t(...definition.title)),
    element("span", ".", "accent"),
  );
  $("page-description").textContent = t(...definition.description);
  document.title = t(...definition.title) + " · InferenceNet";
  if (kind !== "mine") {
    $("guide-title").textContent = t(...definition.guide);
    $("guide-description").textContent = t(...definition.intro);
    $("requirements").replaceChildren(
      ...definition.requirements.map((pair) => element("li", t(...pair))),
    );
    $("folder-tree").textContent = definition.tree;
    $("title").placeholder = t(
      "A concise, descriptive title",
      "简明、具体的成果名称",
    );
    renderFiles();
  }
  renderAccount();
  renderAuth();
}
function renderAccount() {
  $("account").textContent = user ? user.username : t("Sign in", "登录");
  $("logout").hidden = !user;
}
function renderAuth() {
  $("auth-title").textContent = registering
    ? t("Join the initiative.", "加入共建。")
    : t("Welcome back.", "欢迎回来。");
  $("auth-description").textContent = registering
    ? t(
        "Choose a username and a password with at least 12 characters.",
        "设置用户名和至少 12 个字符的密码。",
      )
    : t(
        "Sign in to submit materials and view your receipts.",
        "登录后提交材料并查看回执。",
      );
  $("auth-submit").textContent = registering
    ? t("Create account →", "创建账号 →")
    : t("Sign in →", "登录 →");
  $("switch-auth").textContent = registering
    ? t("Already have an account? Sign in", "已有账号？登录")
    : t("New here? Create an account", "第一次来？创建账号");
  $("password").autocomplete = registering
    ? "new-password"
    : "current-password";
  $("password").minLength = registering ? 12 : 1;
}
function signIn() {
  if (!user) {
    $("auth-error").textContent = "";
    $("auth-dialog").showModal();
    return false;
  }
  return true;
}
async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body !== undefined && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  if (options.method && options.method !== "GET")
    headers["X-CSRF-Token"] = csrf || "";
  const response = await fetch("/api/v1" + path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error?.message ||
        data.validation?.errors?.join("\n") ||
        t("Request failed.", "请求未完成。"),
    );
    error.status = response.status;
    error.data = data;
    if (response.status === 401) user = null;
    throw error;
  }
  return data;
}
async function refreshSession() {
  const state = await api("/session");
  user = state.user;
  csrf = state.csrf_token;
  renderAccount();
  await refreshRecords();
}
function setBusy(value) {
  busy = value;
  [
    "choose-folder",
    "load-example",
    "clear-files",
    "title",
    "license",
    "version-of",
    "submit",
  ].forEach((id) => {
    if ($(id)) $(id).disabled = value;
  });
}
function renderFiles() {
  $("file-summary").hidden = !files.length;
  $("manifest-note").hidden = !files.length;
  $("file-total").textContent = t(
    files.length + " files",
    files.length + " 个文件",
  );
  $("byte-total").textContent = bytes(
    files.reduce((sum, item) => sum + item.file.size, 0),
  );
  $("file-list").replaceChildren(
    ...files.slice(0, 150).map((item) => {
      const row = element("div", undefined, "file-row");
      row.append(
        element("span", item.path),
        element("span", bytes(item.file.size)),
      );
      return row;
    }),
  );
  if (files.length > 150)
    $("file-list").append(
      element(
        "div",
        t(
          "… and " + (files.length - 150) + " more files",
          "… 另有 " + (files.length - 150) + " 个文件",
        ),
        "hint",
      ),
    );
}
async function chooseFiles(selected) {
  const list = Array.from(selected);
  if (!list.length) return;
  const paths = list.map((file) => file.webkitRelativePath || file.name);
  const strip = paths.every(
    (path) =>
      path.includes("/") && path.split("/")[0] === paths[0].split("/")[0],
  );
  files = list
    .map((file, i) => ({
      file,
      path: strip ? paths[i].split("/").slice(1).join("/") : paths[i],
    }))
    .filter((item) => item.path !== "submission.json")
    .sort((a, b) => a.path.localeCompare(b.path));
  const manifest = list.find(
    (file, i) =>
      (strip ? paths[i].split("/").slice(1).join("/") : paths[i]) ===
      "submission.json",
  );
  if (manifest && manifest.size <= 4194304) {
    try {
      const value = JSON.parse(await manifest.text());
      if (value.type !== kind)
        throw new Error(
          t(
            "This folder belongs to a different submission type.",
            "这个文件夹属于其他提交类型。",
          ),
        );
      $("title").value = value.title || "";
      $("license").value = value.license || "MIT";
    } catch (error) {
      notice(error.message, true);
    }
  }
  renderFiles();
  $("receipt-panel").hidden = true;
  notice(
    t(
      "Folder selected. Review the title and license, then check and submit.",
      "文件夹已选择。确认标题和许可后，点击检查并提交。",
    ),
  );
}
function progress(value, message) {
  $("progress-area").hidden = false;
  $("progress").value = value;
  $("progress-text").textContent = message;
  $("progress-percent").textContent = Math.round(value) + "%";
}
function uploadFile(uploadId, entry, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", "/api/v1/uploads/" + uploadId + "/files/" + entry.file_id);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-CSRF-Token", csrf);
    xhr.timeout = 7200000;
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      if (xhr.status === 204) resolve();
      else {
        let value = {};
        try {
          value = JSON.parse(xhr.responseText);
        } catch {}
        const error = new Error(
          value.error?.message ||
            t(
              "Upload failed. Retry with the same folder.",
              "上传失败。请保留同一文件夹并重试。",
            ),
        );
        error.status = xhr.status;
        error.data = value;
        reject(error);
      }
    };
    xhr.onerror = xhr.ontimeout = () =>
      reject(
        new Error(
          t(
            "Connection interrupted. Select the same folder and retry to resume verified files.",
            "连接中断。重新选择同一文件夹并重试，可跳过已校验的文件。",
          ),
        ),
      );
    xhr.send(file);
  });
}
async function submit() {
  await sessionReady;
  if (!signIn() || busy) return;
  if (
    !files.length ||
    !$("title").value.trim() ||
    !$("license").value.trim() ||
    !$("consent").checked
  ) {
    notice(
      t(
        "Choose a folder, enter a title and license, and confirm permission to submit.",
        "请选择文件夹、填写标题与许可，并确认有权提交。",
      ),
      true,
    );
    return;
  }
  setBusy(true);
  notice("");
  $("receipt-panel").hidden = true;
  try {
    if (
      files.length > 2000 ||
      files.reduce((n, f) => n + f.file.size, 0) > 1073741824
    )
      throw new Error(
        t(
          "Choose at most 2,000 files, up to 1 GiB in total.",
          "最多选择 2,000 个文件，总大小不超过 1 GiB。",
        ),
      );
    const inventory = [];
    for (let i = 0; i < files.length; i++) {
      progress(
        (i / files.length) * 15,
        t("Checking files", "正在校验文件") +
          " · " +
          (i + 1) +
          "/" +
          files.length,
      );
      inventory.push({
        path: files[i].path,
        bytes: files[i].file.size,
        sha256: await hashFile(files[i].file),
      });
    }
    const payload = {
      schema_version: "0.1.0",
      title: $("title").value.trim(),
      license: $("license").value.trim(),
      files: inventory,
    };
    const versionOf = $("version-of").value;
    const cacheKey = "inferencenet-upload:" + user.id + ":" + kind;
    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(cacheKey));
    } catch {}
    const serialized = JSON.stringify({ payload, versionOf });
    if (!cached || cached.serialized !== serialized) {
      cached = { key: crypto.randomUUID(), serialized };
      sessionStorage.setItem(cacheKey, JSON.stringify(cached));
    }
    let initialized, current;
    const resume = new URLSearchParams(location.search).get("resume");
    if (resume) {
      const version = new URLSearchParams(location.search).get("version");
      current = await api("/submissions/" + resume + "/versions/" + version);
      const expected = current.files
        .map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }))
        .sort((a, b) => a.path.localeCompare(b.path));
      if (
        JSON.stringify(expected) !== JSON.stringify(inventory) ||
        current.title !== payload.title ||
        current.license !== payload.license
      )
        throw new Error(
          t(
            "Select the original folder, title and license to resume this upload.",
            "继续上传需选择原始文件夹，并保持原来的标题和许可。",
          ),
        );
      initialized = current;
    } else {
      initialized = await api(
        versionOf
          ? "/submissions/" + versionOf + "/versions/init"
          : "/submissions/" + kind + "/init",
        {
          method: "POST",
          body: payload,
          headers: { "Idempotency-Key": cached.key },
        },
      );
      current = await api(
        "/submissions/" +
          initialized.submission_id +
          "/versions/" +
          initialized.version,
      );
    }
    $("step-files").classList.remove("current");
    $("step-upload").classList.add("current");
    let transferred = 0,
      total = files.reduce((n, f) => n + f.file.size, 0) || 1;
    for (const entry of current.files) {
      const source = files.find((file) => file.path === entry.path);
      if (entry.state !== "verified") {
        await uploadFile(initialized.upload_id, entry, source.file, (loaded) =>
          progress(
            15 + ((transferred + loaded) / total) * 75,
            t("Uploading", "正在上传") + " · " + entry.path,
          ),
        );
      }
      transferred += source.file.size;
      progress(
        15 + (transferred / total) * 75,
        t("Uploaded", "已上传") + " · " + entry.path,
      );
    }
    progress(
      94,
      t("Validating and sealing your submission…", "正在校验并封存提交…"),
    );
    const result = await api(
      "/uploads/" + initialized.upload_id + "/complete",
      {
        method: "POST",
        body: {},
        headers: { "Idempotency-Key": cached.key + "-complete" },
      },
    );
    receipt = { id: result.submission_id, version: result.version };
    sessionStorage.removeItem(cacheKey);
    progress(100, t("Submission received.", "提交已受理。"));
    $("step-upload").classList.remove("current");
    $("step-receipt").classList.add("current");
    $("receipt-id").textContent = receipt.id + " / v" + receipt.version;
    $("receipt-panel").hidden = false;
    $("receipt-panel").scrollIntoView({ behavior: "smooth", block: "center" });
    await refreshRecords();
  } catch (error) {
    if (
      error.data?.state === "validation_failed" ||
      error.status === 410 ||
      error.data?.error?.code === "upload_closed"
    ) {
      try {
        sessionStorage.removeItem(
          "inferencenet-upload:" + user.id + ":" + kind,
        );
      } catch {}
    }
    notice(translatedError(error), true);
    await refreshRecords();
  } finally {
    setBusy(false);
  }
}
async function downloadReceipt(id, version) {
  const response = await fetch(
    "/api/v1/submissions/" + id + "/versions/" + version + "/receipt",
    { credentials: "same-origin" },
  );
  if (!response.ok)
    throw new Error(t("Receipt is not available.", "回执尚不可用。"));
  const url = URL.createObjectURL(await response.blob());
  const anchor = element("a");
  anchor.href = url;
  anchor.download = id + "-v" + version + "-receipt.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const statusLabels = {
  uploading: ["Uploading", "待完成上传"],
  validating: ["Validating", "校验中"],
  awaiting_review: ["Awaiting review", "待审核"],
  validation_failed: ["Needs changes", "需要修改"],
  expired: ["Expired", "已过期"],
};
function recordCard(item) {
  const card = element("article", undefined, "submission-card");
  const content = element("div");
  content.append(
    element(
      "span",
      t(...(statusLabels[item.state] || [item.state, item.state])),
      "status-pill" + (item.state === "validation_failed" ? " failed" : ""),
    ),
    element("h3", item.title),
    element("code", item.submission_id + " / v" + item.version),
    element(
      "p",
      (definitions[item.type]
        ? t(...definitions[item.type].guide)
        : item.type) +
        " · " +
        bytes(item.total_bytes) +
        " · " +
        new Date(item.created_at).toLocaleString(
          language === "zh" ? "zh-CN" : "en-GB",
        ),
      "submission-meta",
    ),
  );
  if (item.validation?.errors?.length) {
    const list = element("ul", undefined, "validation-errors");
    item.validation.errors
      .slice(0, 15)
      .forEach((error) => list.append(element("li", error)));
    content.append(list);
  }
  const actions = element("div", undefined, "card-actions");
  if (item.receipt_available) {
    const button = element(
      "button",
      t("Receipt ↓", "下载回执 ↓"),
      "text-button",
    );
    button.onclick = () =>
      downloadReceipt(item.submission_id, item.version).catch((error) =>
        notice(error.message, true),
      );
    actions.append(button);
  }
  const link = element(
    "a",
    t(
      item.state === "uploading" ? "Continue ↗" : "New version ↗",
      item.state === "uploading" ? "继续上传 ↗" : "提交新版本 ↗",
    ),
    "text-link",
  );
  link.href =
    "/submit/" +
    item.type.replace("_", "-") +
    "/?" +
    (item.state === "uploading"
      ? "resume=" + item.submission_id + "&version=" + item.version
      : "version_of=" + item.submission_id);
  actions.append(link);
  card.append(content, actions);
  return card;
}
async function refreshRecords(append = false) {
  if (!user) {
    $("submission-count").textContent = "0";
    if (kind === "mine") {
      $("my-submissions").replaceChildren(
        element(
          "div",
          t("Sign in to view your submissions.", "登录后查看你的提交记录。"),
          "empty",
        ),
      );
    }
    return;
  }
  const result = await api(
    "/submissions" + (append && nextCursor ? "?cursor=" + nextCursor : ""),
  );
  if (!append) {
    $("submission-count").textContent =
      result.items.length + (result.next_cursor ? "+" : "");
    if (kind !== "mine") {
      const select = $("version-of");
      const selected =
        select.value ||
        new URLSearchParams(location.search).get("version_of") ||
        "";
      select.replaceChildren(
        element("option", t("New submission · v1", "新提交 · v1")),
      );
      select.firstChild.value = "";
      const seen = new Set();
      result.items
        .filter((item) => item.type === kind)
        .forEach((item) => {
          if (!seen.has(item.submission_id)) {
            const option = element(
              "option",
              item.title + " · v" + (item.version + 1),
            );
            option.value = item.submission_id;
            select.append(option);
            seen.add(item.submission_id);
          }
        });
      if (seen.has(selected)) select.value = selected;
    }
  }
  nextCursor = result.next_cursor;
  $("more").hidden = !nextCursor;
  if (kind === "mine") {
    if (!append) $("my-submissions").replaceChildren();
    if (!result.items.length && !append)
      $("my-submissions").append(
        element(
          "div",
          t(
            "Your first contribution starts here. Choose a submission type above.",
            "从第一份贡献开始。请选择上方的提交类型。",
          ),
          "empty",
        ),
      );
    result.items.forEach((item) =>
      $("my-submissions").append(recordCard(item)),
    );
  }
}
$("language").onclick = () => {
  language = language === "zh" ? "en" : "zh";
  try {
    localStorage.setItem("inferencenet-language", language);
  } catch {}
  translate();
  refreshRecords().catch((error) => notice(error.message, true));
};
$("theme").onclick = () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("inferencenet-theme", theme);
  } catch {}
  syncTheme();
};
function syncTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("theme-label").textContent = dark ? "Dark" : "Light";
  $("theme").setAttribute("aria-pressed", String(dark));
}
$("account").onclick = async () => {
  await sessionReady;
  if (!user) signIn();
  else location.href = "/submit/mine/";
};
$("logout").onclick = async () => {
  try {
    await api("/auth/logout", { method: "POST", body: {} });
    user = null;
    csrf = null;
    await refreshSession();
    notice(t("Signed out.", "已退出登录。"));
  } catch (error) {
    notice(error.message, true);
  }
};
$("close-auth").onclick = () => $("auth-dialog").close();
$("switch-auth").onclick = () => {
  registering = !registering;
  $("auth-error").textContent = "";
  renderAuth();
};
$("auth-form").onsubmit = async (event) => {
  event.preventDefault();
  $("auth-submit").disabled = true;
  $("auth-error").textContent = "";
  try {
    const state = await api("/auth/" + (registering ? "register" : "login"), {
      method: "POST",
      body: { username: $("username").value, password: $("password").value },
    });
    user = state.user;
    csrf = state.csrf_token;
    $("password").value = "";
    $("auth-dialog").close();
    renderAccount();
    await refreshRecords();
    notice(
      t(
        "You are signed in. Your files will be linked to this account.",
        "已登录。提交材料将关联到此账号。",
      ),
    );
  } catch (error) {
    $("auth-error").textContent = translatedError(error);
  } finally {
    $("auth-submit").disabled = false;
  }
};
$("choose-folder").onclick = () => $("folder").click();
$("folder").onchange = () => chooseFiles($("folder").files);
$("clear-files").onclick = () => {
  files = [];
  $("folder").value = "";
  renderFiles();
};
$("submit").onclick = submit;
$("download-receipt").onclick = () => {
  if (receipt)
    downloadReceipt(receipt.id, receipt.version).catch((error) =>
      notice(error.message, true),
    );
};
$("refresh").onclick = () =>
  refreshRecords().catch((error) => notice(error.message, true));
$("more").onclick = () =>
  refreshRecords(true).catch((error) => notice(error.message, true));
$("load-example").onclick = async () => {
  await sessionReady;
  if (!signIn() || busy) return;
  setBusy(true);
  try {
    const data = await api("/templates/" + kind);
    files = data.files.map((item) => ({
      path: item.path,
      file: new File([item.content], item.path.split("/").pop(), {
        type: "application/octet-stream",
      }),
    }));
    $("title").value = t("Synthetic example · ", "合成示例 · ") + kind;
    $("license").value = "MIT";
    renderFiles();
    notice(
      t(
        "Synthetic example loaded. This is a format demonstration, not an evaluation result.",
        "已载入合成示例。它用于演示提交格式，不代表评测结果。",
      ),
    );
  } catch (error) {
    notice(translatedError(error), true);
  } finally {
    setBusy(false);
  }
};
document.querySelectorAll("[data-kind]").forEach((link) => {
  if (link.dataset.kind === kind) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
});
$("submission-layout").hidden = kind === "mine";
$("mine-panel").hidden = kind !== "mine";
translate();
syncTheme();
sessionReady = refreshSession().catch((error) =>
  notice(
    t(
      "Unable to connect to the service. Please refresh shortly.",
      "暂时无法连接服务，请稍后刷新。",
    ),
    true,
  ),
);
