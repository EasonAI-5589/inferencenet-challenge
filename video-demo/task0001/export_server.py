"""Serve the replay page and receive rendered frames.

POST /frame/<n> stores the request body as frames/frame_<n>.png. Usage:

    python3 export_server.py [PORT]
"""

import http.server
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FRAMES = HERE / "frames"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def do_POST(self):
        match = re.fullmatch(r"/frame/(\d+)", self.path)
        if not match:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers["Content-Length"]))
        ext = "jpg" if self.headers.get("Content-Type") == "image/jpeg" else "png"
        FRAMES.mkdir(exist_ok=True)
        (FRAMES / f"frame_{int(match.group(1)):05d}.{ext}").write_bytes(body)
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 18778
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
