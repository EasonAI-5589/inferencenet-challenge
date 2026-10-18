// Capture replay frames with the local Google Chrome (headless, CDP). Node 22+ (built-in WebSocket and fetch).
// The page is opened 1:1 at 1280×720 with deviceScaleFactor 1.5, so every screenshot is 1920×1080.
//
//   node capture.mjs --page "http://127.0.0.1:PORT/index.html?data=data/fin.json&pause&capture" --info
//   node capture.mjs --page URL --out frames/fin [--from 0 --to 600] [--fps 30]        JPEG frame_%05d.jpg
//   node capture.mjs --page URL --stills 2,8,16 --out out/stills/fin --prefix fin      PNG <prefix>-<s>s.png
//   node capture.mjs --page URL --poster out/fin-poster.jpg                            JPEG at window.replay.posterMs
//
// Chrome runs with a throw-away profile directory that is deleted afterwards. Env: CHROME (browser path).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
const flag = (name) => args.includes(`--${name}`);
const PAGE = opt("page");
if (!PAGE) { console.error("missing --page URL"); process.exit(2); }
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FPS = Number(opt("fps", 30));
const QUALITY = Number(opt("quality", 92));
const OUT = opt("out");
const PREFIX = opt("prefix", "still");

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
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb", "--window-size=1280,720", "about:blank",
], { stdio: "ignore" });

let exitCode = 0;
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
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
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
  listeners.add((msg) => {
    if (msg.method === "Runtime.exceptionThrown") console.error("page exception:", msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
    if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
      console.error(`page ${msg.params.type}:`, msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: PAGE });
  await loaded;
  const info = await evaluate(`window.replayReady.then(() => document.fonts.ready).then(() => ({
    total: window.replay.total, posterMs: window.replay.posterMs, mock: window.replay.mock, partial: window.replay.partial,
    chapters: window.replay.chapters, segments: window.replay.segments || null }))`);
  const count = Math.ceil(info.total / (1000 / FPS));
  const shoot = async (ms, format, file) => {
    await evaluate(`(window.replay.seek(${ms}), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const shot = await send("Page.captureScreenshot", {
      format, ...(format === "jpeg" ? { quality: QUALITY } : {}), clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
    });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(shot.data, "base64"));
  };

  if (flag("info")) {
    console.log(JSON.stringify({ ...info, fps: FPS, count }));
  } else if (opt("stills")) {
    const secs = opt("stills").split(",").map((s) => s.trim()).filter(Boolean).map(Number).filter((s) => Number.isFinite(s));
    for (const s of secs) {
      const ms = Math.min(Math.max(0, s * 1000), info.total - 1);
      const file = join(OUT || ".", `${PREFIX}-${String(s).replace(".", "_")}s.png`);
      await shoot(ms, "png", file);
      console.log(`still ${s}s -> ${file}`);
    }
  } else if (opt("poster")) {
    await shoot(info.posterMs, "jpeg", opt("poster"));
    console.log(`poster ${(info.posterMs / 1000).toFixed(2)}s -> ${opt("poster")}`);
  } else {
    if (!OUT) throw new Error("missing --out for frame capture");
    const from = Math.max(0, Number(opt("from", 0)));
    const to = Math.min(count, Number(opt("to", count)));
    const t0 = Date.now();
    for (let i = from; i < to; i++) {
      await shoot((i * 1000) / FPS, "jpeg", join(OUT, `frame_${String(i).padStart(5, "0")}.jpg`));
      if ((i - from) % 300 === 0) console.log(`frame ${i} / ${count}`);
    }
    console.log(JSON.stringify({ from, to, count, fps: FPS, seconds: Math.round((Date.now() - t0) / 1000) }));
  }
  ws.close();
} catch (err) {
  console.error(err && err.stack || err);
  exitCode = 1;
} finally {
  const exited = new Promise((resolve) => { if (chrome.exitCode !== null) resolve(); else chrome.once("exit", resolve); });
  chrome.kill();
  await Promise.race([exited, sleep(5000)]);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (err) {
    console.error(`warning: could not remove the temporary Chrome profile ${profile}: ${err.message}`);
  }
}
process.exit(exitCode);
