"""Serve this directory for previewing the replay page in a browser (127.0.0.1 only).

    python3 export_server.py [PORT]        # default 18779
    open http://127.0.0.1:18779/index.html?data=data/mock-fin.json

render.py starts its own server on a free port; this one is only for interactive preview.
(The v1/v2 in-page foreignObject exporter is not used here; capture.mjs screenshots Chrome directly.)
"""

import functools
import http.server
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 18779
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=str(HERE)))
    print(f"serving {HERE} at http://127.0.0.1:{port}/index.html?data=data/mock-fin.json")
    server.serve_forever()
