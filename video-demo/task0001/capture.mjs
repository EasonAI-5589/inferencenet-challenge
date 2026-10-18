// 用本机 Chrome 无头模式逐帧截图，输出 frames/frame_%05d.jpg（1920×1080）。
// 比页面内的 export.js（foreignObject 光栅化）快得多，且就是实时页面的渲染结果。
// 用法：先在本目录运行 python3 export_server.py 18779，再运行 node capture.mjs [起始帧] [结束帧]。
// 环境变量：CHROME（浏览器路径）、PORT（默认 18779）、FPS（默认 30）。
// Chrome 使用临时配置目录，结束后关闭并删除，不影响本机已有的浏览器配置。
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGE = `http://127.0.0.1:${process.env.PORT || "18779"}/index.html?pause&capture`;
const FPS = Number(process.env.FPS || 30);
const OUT = join(HERE, "frames");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = fn();
    if (v) return v;
    await sleep(100);
  }
  throw new Error("timed out waiting for Chrome");
}

const profile = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "replay-chrome-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "--window-size=1280,720", "about:blank",
], { stdio: "ignore" });

try {
  const portFile = join(profile, "DevToolsActivePort");
  const port = await waitFor(() => existsSync(portFile) && readFileSync(portFile, "utf8").split("\n")[0].trim());
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = (method) => new Promise((resolve) => {
    const fn = (msg) => { if (msg.method === method) { listeners.delete(fn); resolve(msg.params); } };
    listeners.add(fn);
  });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: PAGE });
  await loaded;
  const total = await evaluate("document.fonts.ready.then(() => window.replay.total)");
  const count = Math.ceil(total / (1000 / FPS));
  const from = Math.max(0, Number(process.argv[2] || 0));
  const to = Math.min(count, Number(process.argv[3] || count));

  mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    await evaluate(`(window.replay.seek(${(i * 1000) / FPS}), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const shot = await send("Page.captureScreenshot", {
      format: "jpeg", quality: 92, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
    });
    writeFileSync(join(OUT, `frame_${String(i).padStart(5, "0")}.jpg`), Buffer.from(shot.data, "base64"));
    if ((i - from) % 200 === 0) console.log(`frame ${i} / ${count}`);
  }
  console.log(JSON.stringify({ from, to, count, fps: FPS, seconds: Math.round((Date.now() - t0) / 1000) }));
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
