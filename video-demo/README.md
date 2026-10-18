# Video demo 开发交接

分支：`codex/video-demo`。这里集中保存 2026-10-18 的两份最新演示成品、可编辑动画源码、画面数据、字体和导出脚本。

| Demo | 成品 | 动画入口 | 时长 |
|---|---|---|---|
| Task 0001 · 计量经济学复现，GPT-5.6 Sol + DeepAgents | [MP4](media/InferenceNet-task0001-agent-replay-16x9.mp4) · [封面](media/task0001-poster.jpg) | [task0001/index.html](task0001/index.html) | 71.4 秒 |
| FIN-T1-003 · 金融月结审阅故事版 | [MP4](media/InferenceNet-FIN-T1-003-story-demo-16x9.mp4) · [封面](media/finance-story-poster.jpg) | [finance/story.html](finance/story.html) | 78.133 秒 |

两份均为 1920×1080、30 fps、H.264、无声 MP4。Task 0001 是 16:9 v2，替代旧的 `InferenceNet-task0001-agent-replay-demo-20261016.zip` 中的 4:5 动画；金融采用最新 story 版。

## 单独下载源码 ZIP

- [Task 0001 最新源码包](source-archives/InferenceNet-task0001-source-20261018.zip)
- [FIN-T1-003 金融故事版源码包](source-archives/InferenceNet-FIN-T1-003-story-source-20261018.zip)

每包包含该视频的可编辑动画、已有数据快照、字体与许可证、导出脚本、独立 README 和校验表。MP4 从上表单独下载。解压后按包内 README 预览或导出，无需克隆整个网站。仓库仍保留展开源码，便于直接修改、提交。

修改源码后运行 `python3 video-demo/build_source_archives.py`（从仓库根目录）可重新打包并更新交付校验表。

## 获取和预览

```sh
git clone --branch codex/video-demo --single-branch https://github.com/EasonAI-5589/inferencenet-challenge.git
cd inferencenet-challenge
python3 -m http.server 4198 --bind 127.0.0.1
```

从仓库根目录启动后，在浏览器打开：

- Task 0001：`http://127.0.0.1:4198/video-demo/task0001/index.html`
- 金融故事版：`http://127.0.0.1:4198/video-demo/finance/story.html`

预览只需要 Python 3 和浏览器，无需 npm 安装、模型账号、API key 或私有数据。若本机已有项目预览服务占用 4198，先与服务维护者协调目录，避免重复启动。

空格暂停／继续，方向键前后跳 2 秒；URL 加 `?t=30&pause` 可停在第 30 秒。金融页默认读取 `data/fin-story.json`，也可通过 `?data=data/fin-story.json&t=30&pause` 指定数据。

## 从哪里改

| 要改的内容 | 文件 |
|---|---|
| Task 0001 布局、配色、字幕、动画时间轴 | `task0001/index.html`（包含 CSS 和动画 JS） |
| Task 0001 运行轨迹、代码、数字 | `task0001/replay-data.js` |
| 金融布局和样式 | `finance/story.html` |
| 金融场景、转场、时间轴和固定字幕 | `finance/story.js` |
| 金融故事数据、任务条目、步骤、数值和评分 | `finance/data/fin-story.json` |
| 金融翻译与评分分组的编辑依据 | `finance/story/fin-story.curation.json` |
| 字体与许可证 | 各目录的 `fonts/` |

`fin-story.curation.json` 是编辑依据，页面直接消费已生成的 `fin-story.json`；仅改 curation 不会自动更新画面。更改数据时保留事实与编辑文字的区别，不把演示中的历史单次运行写成新评测结果。

## 重新导出 MP4

导出需要 Node.js 22+、Python 3、Chrome/Chromium 和 ffmpeg。现有捕获脚本会启动独立的临时浏览器配置目录；浏览器路径可用环境变量 `CHROME` 指定。macOS 默认路径是 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。Linux/Windows 请设为本机浏览器可执行文件路径；中文字体需系统提供（建议安装 Noto Sans CJK）。

### Task 0001

终端一：

```sh
cd video-demo/task0001
python3 export_server.py 18779
```

终端二，从同一目录执行：

```sh
node capture.mjs
ffmpeg -framerate 30 -i frames/frame_%05d.jpg \
  -vf "scale=in_range=pc:out_range=tv,format=yuv420p" \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:v libx264 -preset slow -crf 18 -movflags +faststart \
  ../media/InferenceNet-task0001-agent-replay-16x9.mp4
```

当前动画为 2142 帧。改动时间轴后，`capture.mjs` 会从页面读取新的总时长。`export.js` 是保留的页面内备用导出实现。

### 金融故事版

```sh
cd video-demo/finance
python3 render.py --page story.html --data data/fin-story.json --name fin-story
```

生成 `out/fin-story.mp4`、`out/fin-story-poster.jpg` 和 `out/fin-story-contact-sheet.jpg`。审阅后再用新成品更新 `../media/` 下对应文件。`FFMPEG` 和 `NODE` 可覆盖工具路径；默认从 PATH 查找。只导出预览帧：

```sh
python3 render.py --page story.html --data data/fin-story.json --name fin-story \
  --stills 2,7,16,30,44,60,72 --stills-only
```

`frames/`、`out/` 和 Python 缓存不进入 Git。

## 数据来源与交接范围

- Task 0001 保留原始 `replay-data.js`，来源 run ID 为 `sol-deepagents-full1000-20260911-chain-03`，task `0001`、arm `deepagents`；源文件校验值见 `task0001/provenance.json`。其中个人电脑路径已改为逻辑标识。
- 金融故事保留原始 `fin-story.json` 和 curation；来源、生成时间、输入校验值及翻译／分组说明在 JSON 的 `provenance` 和 `grouping_rule` 中。
- 两份均压缩了时间轴；画面数据属于既有运行记录。此分支未运行新模型、未重算成绩。
- 动画预览与导出使用自带快照即可。私有原始任务包、原始会话、运行环境、账号配置，以及依赖这些材料的数据提取脚本不在本交接内；若需重建研究证据，应向项目维护者取得对应材料。
- `SHA256SUMS` 记录本次交付文件的校验值，在 `video-demo/` 下用 `shasum -a 256 -c SHA256SUMS` 校验；修改源码后原校验值会失效。

本分支基于网站 `main` 的 `91e015f`，交接改动集中在 `video-demo/` 和根 README。GitHub 的 **Code → Download ZIP** 可以打包下载整个分支。开发时继续提交到此分支；需要上线时再单独审阅合入 `main`。
