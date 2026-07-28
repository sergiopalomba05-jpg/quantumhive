import os, json, logging, time
from http.server import HTTPServer, BaseHTTPRequestHandler
from google.genai import Client
from google.genai.types import Content, Part
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/AppData/Local/hermes/.env"))

PORT = int(os.getenv("VERTEX_PROXY_PORT", "8765"))
MODEL = os.getenv("VERTEX_PROXY_MODEL", "gemini-2.5-flash")
PROJECT = os.getenv("VERTEX_PROXY_PROJECT") or os.getenv("VERTEX_PROJECT_ID") or ""
LOCATION = os.getenv("VERTEX_PROXY_LOCATION") or os.getenv("VERTEX_LOCATION", "us-central1")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

try:
    client = Client(vertexai=True, project=PROJECT, location=LOCATION)
    logging.info(f"Vertex AI client OK — model: {MODEL}, project: {PROJECT}")
except Exception as e:
    logging.error(f"Failed to init Vertex AI client: {e}")
    client = None

class VertexProxyHandler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/v1/models":
            data = json.dumps({
                "object": "list",
                "data": [{
                    "id": MODEL,
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "vertex-ai"
                }]
            })
            self._send_json(200, data)
        else:
            self._send_json(404, json.dumps({"error": "not_found"}))

    def do_POST(self):
        if self.path == "/v1/chat/completions":
            self._handle_chat()
        elif self.path.startswith("/v1/"):
            self._send_json(404, json.dumps({"error": f"endpoint {self.path} not found"}))
        else:
            self._send_json(404, json.dumps({"error": "not_found"}))

    def _handle_chat(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            messages = body.get("messages", [])
            stream = body.get("stream", False)

            system_msg = None
            chat_history = []
            for m in messages:
                if m["role"] == "system":
                    system_msg = m["content"]
                else:
                    role = "model" if m["role"] == "assistant" else "user"
                    content = m.get("content", "")
                    if isinstance(content, list):
                        texts = [p.get("text", "") for p in content if p.get("type") == "text"]
                        content = " ".join(texts)
                    chat_history.append(Content(role=role, parts=[Part(text=str(content))]))

            config = {"temperature": body.get("temperature", 0.6)}
            if system_msg:
                config["system_instruction"] = system_msg

            if not client:
                raise Exception("Vertex AI client not initialized")

            response = client.models.generate_content(
                model=MODEL,
                contents=chat_history,
                config=config,
            )

            reply = response.text if response and response.text else ""

            completion = {
                "id": "chatcmpl-vertex-" + str(int(time.time())),
                "object": "chat.completion",
                "created": int(time.time()),
                "model": MODEL,
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": reply},
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0
                }
            }

            if stream:
                self.send_response(200)
                self._cors_headers()
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self.end_headers()

                chunk = {
                    "id": completion["id"],
                    "object": "chat.completion.chunk",
                    "created": completion["created"],
                    "model": MODEL,
                    "choices": [{"index": 0, "delta": {"role": "assistant", "content": reply}, "finish_reason": "stop"}]
                }
                self.wfile.write(f"data: {json.dumps(chunk)}\n\n".encode())
                self.wfile.write("data: [DONE]\n\n".encode())
            else:
                self._send_json(200, json.dumps(completion))

        except Exception as e:
            logging.error("Chat error: %s", str(e))
            self._send_json(500, json.dumps({"error": {"message": str(e), "type": "error"}}))

    def _send_json(self, code, data):
        self.send_response(code)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data.encode())

    def log_message(self, format, *args):
        logging.info(format, *args)

if __name__ == "__main__":
    logging.info(f"Vertex AI Proxy on 0.0.0.0:{PORT}")
    HTTPServer(("0.0.0.0", PORT), VertexProxyHandler).serve_forever()
