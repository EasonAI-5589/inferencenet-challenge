#!/usr/bin/env python3
"""Build two standalone source ZIPs and refresh the delivery checksums.

Run from any directory: python3 video-demo/build_source_archives.py
Only the explicit source-file lists below enter the archives.
"""

import hashlib
from pathlib import Path
import zipfile

HERE = Path(__file__).resolve().parent
COMMON = ["capture.mjs", "export_server.py", "fonts/inter-latin.woff2", "fonts/inter-OFL.txt"]
INTRO = """This is the editable animation source, with its recorded data snapshot,
fonts, font licence and export scripts. The finished MP4 is supplied separately.
Preview requires Python 3 and a browser; no API key or private data is needed.
Space pauses/resumes; arrow keys seek. Add ?t=30&pause to hold at 30 seconds.

Export requires Python 3, Node.js 22+, Chrome/Chromium and ffmpeg.
Set CHROME to your browser executable if it is not at the standard macOS path.
Capture uses a separate temporary browser profile. A Chinese system font
(such as Noto Sans CJK) is needed for Chinese text.

The data represents a historical run, with a compressed timeline. This source
package does not contain private raw task files, model credentials or tools
for rebuilding the original research run.
"""

PACKAGES = [
    ("task0001", "InferenceNet-task0001-source-20261018", COMMON + [
        "index.html", "replay-data.js", "export.js", "provenance.json",
    ], """# Task 0001 · 16:9 replay source

After extracting, enter this directory (the one containing index.html).

## Preview

```sh
python3 -m http.server 4198 --bind 127.0.0.1
```

Open http://127.0.0.1:4198/index.html. Reuse or coordinate any existing service
on that port before starting another one.

Edit index.html for layout, captions and animation; replay-data.js holds the
recorded trajectory and values. Source-file hashes are in provenance.json.

## Export

Terminal one, in this directory:

```sh
python3 export_server.py 18779
```

Terminal two, in the same directory:

```sh
node capture.mjs
ffmpeg -framerate 30 -i frames/frame_%05d.jpg \\
  -vf "scale=in_range=pc:out_range=tv,format=yuv420p" \\
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \\
  -c:v libx264 -preset slow -crf 18 -movflags +faststart \\
  InferenceNet-task0001-agent-replay-16x9.mp4
```

The current timeline has 2142 frames at 30 fps (71.4 seconds).
"""),
    ("finance", "InferenceNet-FIN-T1-003-story-source-20261018", COMMON + [
        "story.html", "story.js", "render.py", "data/fin-story.json",
        "story/fin-story.curation.json",
    ], """# FIN-T1-003 · finance story source

After extracting, enter this directory (the one containing story.html).

## Preview

```sh
python3 -m http.server 4198 --bind 127.0.0.1
```

Open http://127.0.0.1:4198/story.html. Reuse or coordinate any existing service
on that port before starting another one.

Edit story.html for layout, story.js for animation and fixed captions, and
data/fin-story.json for the existing story data. The curation file records
editorial choices; changing it alone does not update the page's JSON snapshot.

## Export

```sh
python3 render.py --page story.html --data data/fin-story.json --name fin-story
```

Use --page story.html explicitly. The default index.html is not part of this
package. Outputs are out/fin-story.mp4, its poster and contact sheet.
Set FFMPEG or NODE to override executables; otherwise they are found on PATH.
The current video has 2344 frames at 30 fps (78.133 seconds).
"""),
]


def checksum_lines(files):
    return "".join(f"{hashlib.sha256(data).hexdigest()}  {name}\n" for name, data in sorted(files.items()))


def main():
    archive_dir = HERE / "source-archives"
    archive_dir.mkdir(exist_ok=True)
    for source, name, paths, instructions in PACKAGES:
        files = {path: (HERE / source / path).read_bytes() for path in paths}
        files["README.md"] = (instructions + "\n## Requirements and scope\n\n" + INTRO +
                              "\nVerify the extracted files: `shasum -a 256 -c SHA256SUMS`.\n").encode()
        files[".gitignore"] = (HERE / ".gitignore").read_bytes()
        files["SHA256SUMS"] = checksum_lines(files).encode()
        target = archive_dir / f"{name}.zip"
        with zipfile.ZipFile(target, "w") as archive:
            for relative, data in sorted(files.items()):
                info = zipfile.ZipInfo(f"{name}/{relative}", date_time=(2026, 10, 18, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
        print(f"{target.name}: {len(files)} files, {target.stat().st_size:,} bytes")

    paths = [HERE / "README.md", HERE / ".gitignore", Path(__file__).resolve()]
    for folder in ("task0001", "finance", "media", "source-archives"):
        paths.extend(p for p in (HERE / folder).rglob("*") if p.is_file()
                     and not any(part in {"__pycache__", "frames", "out"} for part in p.relative_to(HERE).parts))
    files = {p.relative_to(HERE).as_posix(): p.read_bytes() for p in paths}
    (HERE / "SHA256SUMS").write_text(checksum_lines(files), encoding="utf-8")


if __name__ == "__main__":
    main()
