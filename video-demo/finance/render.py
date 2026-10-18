#!/usr/bin/env python3
"""Render one replay data file end to end: MP4 + poster + contact sheet, and/or PNG stills.

    python3 render.py --data data/fin.json --name fin
    python3 render.py --data data/hr.json --name hr --stills 2,8,16,35,55,68,76
    python3 render.py --data data/mock-hr.json --name mock-hr --stills 2,8,16,35,55,68 --stills-only

Starts a static server for this directory on a free 127.0.0.1 port, opens
index.html?data=...&pause&capture in the local Google Chrome (headless, via capture.mjs), captures 1920×1080
JPEG frames in --jobs parallel segments into frames/<name>/, then encodes out/<name>.mp4 with ffmpeg
(H.264 High, yuv420p, BT.709 tv range). Outputs: out/<name>.mp4, out/<name>-poster.jpg (score frame),
out/<name>-contact-sheet.jpg (one frame every 3 s), out/stills/<name>/<name>-<s>s.png. Frames are deleted after a
successful encode unless --keep-frames. Standard library only; needs node (22+), Chrome and ffmpeg.
"""

import argparse
import functools
import http.server
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
NODE = os.environ.get("NODE") or shutil.which("node") or "/opt/homebrew/bin/node"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def start_server():
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(HERE)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def run_capture(page, *extra, check=True):
    proc = subprocess.run([NODE, str(HERE / "capture.mjs"), "--page", page, *extra], cwd=HERE, capture_output=True, text=True)
    if proc.stderr.strip():
        print(proc.stderr.strip(), file=sys.stderr)
    if check and proc.returncode != 0:
        raise SystemExit(f"capture.mjs failed ({proc.returncode})")
    return proc.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--page", default="index.html", help="page to render: index.html (replay) or story.html (story)")
    parser.add_argument("--data", required=True, help="data file inside this directory, e.g. data/fin.json")
    parser.add_argument("--name", required=True, help="output name, e.g. fin")
    parser.add_argument("--stills", help="comma-separated seconds for PNG stills, e.g. 2,8,16,35,55,68,76")
    parser.add_argument("--stills-only", action="store_true", help="only write stills and the poster, no video")
    parser.add_argument("--jobs", type=int, default=4, help="parallel capture segments (Chrome instances)")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--keep-frames", action="store_true")
    args = parser.parse_args()

    data = (HERE / args.data).resolve() if not os.path.isabs(args.data) else pathlib.Path(args.data).resolve()
    if not data.is_file():
        raise SystemExit(f"data file not found: {data}")
    try:
        rel = data.relative_to(HERE).as_posix()
    except ValueError:
        raise SystemExit("the data file must live inside the video/ directory (the page server only serves it)")
    json.loads(data.read_text(encoding="utf-8"))  # fail early on broken JSON

    if not (HERE / args.page).is_file() or "/" in args.page:
        raise SystemExit(f"page not found in this directory: {args.page}")
    out = HERE / "out"
    out.mkdir(exist_ok=True)
    httpd = start_server()
    page = f"http://127.0.0.1:{httpd.server_address[1]}/{args.page}?data={urllib.parse.quote(rel)}&pause&capture"
    t0 = time.time()
    report = {"name": args.name, "page": args.page, "data": rel}
    try:
        info = json.loads(run_capture(page, "--info", "--fps", str(args.fps)).strip().splitlines()[-1])
        report.update(total_s=round(info["total"] / 1000, 2), frames=info["count"], fps=args.fps, mock=info["mock"],
                      partial=info["partial"], poster_s=round(info["posterMs"] / 1000, 2))
        if info["mock"]:
            print("note: data is marked mock; every frame carries the MOCK watermark")

        if args.stills:
            sdir = out / "stills" / args.name
            sdir.mkdir(parents=True, exist_ok=True)
            run_capture(page, "--stills", args.stills, "--out", str(sdir), "--prefix", args.name)
            report["stills"] = str(sdir.relative_to(HERE))

        poster = out / f"{args.name}-poster.jpg"
        if args.stills_only:
            run_capture(page, "--poster", str(poster))
            report["poster"] = str(poster.relative_to(HERE))
        else:
            frames = HERE / "frames" / args.name
            if frames.exists():
                shutil.rmtree(frames)
            frames.mkdir(parents=True)
            count = info["count"]
            jobs = max(1, min(args.jobs, count))
            size = math.ceil(count / jobs)
            t_cap = time.time()
            procs = []
            for j in range(jobs):
                a, b = j * size, min(count, (j + 1) * size)
                if a >= b:
                    continue
                procs.append(subprocess.Popen([NODE, str(HERE / "capture.mjs"), "--page", page, "--out", str(frames),
                                               "--from", str(a), "--to", str(b), "--fps", str(args.fps)],
                                              cwd=HERE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
            failed = False
            for p in procs:
                so, se = p.communicate()
                if se.strip():
                    print(se.strip(), file=sys.stderr)
                if p.returncode != 0:
                    failed = True
            if failed:
                raise SystemExit("frame capture failed")
            got = len(list(frames.glob("frame_*.jpg")))
            if got != count:
                raise SystemExit(f"expected {count} frames, found {got}")
            report["capture_s"] = round(time.time() - t_cap, 1)

            mp4 = out / f"{args.name}.mp4"
            t_enc = time.time()
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-framerate", str(args.fps), "-i", str(frames / "frame_%05d.jpg"),
                            "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p,"
                                   "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
                            "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", str(mp4)], check=True)
            report["encode_s"] = round(time.time() - t_enc, 1)
            idx = min(count - 1, round(info["posterMs"] / 1000 * args.fps))
            shutil.copyfile(frames / f"frame_{idx:05d}.jpg", poster)
            rows = max(1, math.ceil(info["total"] / 1000 / 3 / 6))
            sheet = out / f"{args.name}-contact-sheet.jpg"
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp4), "-vf",
                            f"fps=1/3,scale=320:-1,tile=6x{rows}:padding=4:color=white", "-frames:v", "1", str(sheet)], check=True)
            report.update(video=str(mp4.relative_to(HERE)), mp4_bytes=mp4.stat().st_size,
                          poster=str(poster.relative_to(HERE)), contact_sheet=str(sheet.relative_to(HERE)))
            if not args.keep_frames:
                shutil.rmtree(frames)
                try:
                    (HERE / "frames").rmdir()
                except OSError:
                    pass
    finally:
        httpd.shutdown()
    report["wall_s"] = round(time.time() - t0, 1)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
