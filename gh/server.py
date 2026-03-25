import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from main import generate_layout_from_parameters

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))


class Handler(BaseHTTPRequestHandler):

    # ---------------------------
    # CORS Headers
    # ---------------------------
    def _set_headers(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ---------------------------
    # Handle preflight requests
    # ---------------------------
    def do_OPTIONS(self):
        self._set_headers()

    # ---------------------------
    # Handle POST
    # ---------------------------
    def do_POST(self):

        if self.path == "/exports/parameters.json":

            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)

            parameters = json.loads(body)

            param_path = os.path.join(project_root, "exports", "parameters.json")

            with open(param_path, "w") as f:
                json.dump(parameters, f, indent=4)

            # Generate layout
            generate_layout_from_parameters()

            self._set_headers()


server = HTTPServer(("localhost", 8000), Handler)

print("Server running on http://localhost:8000")

server.serve_forever()