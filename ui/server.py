import http.server
import socketserver
import json
import urllib.parse
import os
import sys
import subprocess
import threading
import time
import re
import webbrowser

# Add current directory to path
UI_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(UI_DIR)
sys.path.insert(0, UI_DIR)

import importer

PORT = 5000
CONFIG_FILE = os.path.join(UI_DIR, "config.json")
RUN_DIR = os.path.join(ROOT_DIR, "bin", "x64", "Release")
if not os.path.exists(RUN_DIR):
    RUN_DIR = ROOT_DIR

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "client_id": os.environ.get("FELLOWSHIP_CLIENT_ID", ""),
        "client_secret": os.environ.get("FELLOWSHIP_CLIENT_SECRET", "")
    }

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

class FellowSimcHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        
        if url.path == "/api/config":
            cfg = load_config()
            self.send_json(200, {
                "client_id": cfg.get("client_id", ""),
                "has_secret": bool(cfg.get("client_secret"))
            })
            return

        elif url.path == "/api/report":
            report_path = os.path.join(RUN_DIR, "latest_sim.html")
            if not os.path.exists(report_path):
                report_path = os.path.join(ROOT_DIR, "newTest.html")
            if os.path.exists(report_path):
                try:
                    with open(report_path, "r", encoding="utf-8", errors="replace") as f:
                        html_str = f.read()
                    
                    theme_style = """
<style id="fg-simc-theme">
body, html {
  background-color: #0f0f11 !important;
  color: #ecedee !important;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
}
#header, .header, h1, h2, h3, h4, h5, h6, .player-name, .section-title, .title {
  color: #b08e58 !important;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
}
a, a:visited {
  color: #b08e58 !important;
  text-decoration: none !important;
}
a:hover {
  color: #d4af6e !important;
  text-decoration: underline !important;
}
table {
  background-color: #121215 !important;
  border: 1px solid #27272a !important;
  border-radius: 8px !important;
}
th {
  background-color: #18181b !important;
  color: #b08e58 !important;
  font-weight: 700 !important;
  border-bottom: 1px solid #27272a !important;
}
td {
  border-bottom: 1px solid #1f1f23 !important;
  color: #ecedee !important;
}
tr:nth-child(even) td {
  background-color: #151519 !important;
}
tr:hover td {
  background-color: #1d1d23 !important;
}
.panel, .card, fieldset, .tab-pane, .tab-content, div.section, div.box {
  background-color: #121215 !important;
  border: 1px solid #27272a !important;
  border-radius: 8px !important;
}
nav, .nav, .tabs, ul.nav-tabs, div.navbar {
  background-color: #0f0f11 !important;
  border-bottom: 1px solid #27272a !important;
}
pre, code {
  background-color: #09090b !important;
  border: 1px solid #27272a !important;
  color: #ecedee !important;
  border-radius: 6px !important;
}
hr {
  border-color: #27272a !important;
}
</style>
"""
                    if "</head>" in html_str:
                        html_str = html_str.replace("</head>", f"{theme_style}</head>", 1)
                    else:
                        html_str += theme_style
                        
                    content = html_str.encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Cache-Control", "no-cache")
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                except Exception as e:
                    self.send_json(500, {"error": f"Failed to load report: {e}"})
            else:
                self.send_json(404, {"error": "No simulation report available yet."})
            return

        # Serve static frontend files
        rel_path = url.path.lstrip("/")
        if not rel_path or rel_path == "index.html":
            file_path = os.path.join(UI_DIR, "static", "index.html")
        else:
            file_path = os.path.normpath(os.path.join(UI_DIR, "static", rel_path))

        static_root = os.path.abspath(os.path.join(UI_DIR, "static"))
        target_path = os.path.abspath(file_path)

        if os.path.isfile(target_path) and target_path.startswith(static_root):
            mime_type = "text/plain"
            if target_path.endswith(".html"): mime_type = "text/html; charset=utf-8"
            elif target_path.endswith(".css"): mime_type = "text/css; charset=utf-8"
            elif target_path.endswith(".js"): mime_type = "application/javascript; charset=utf-8"
            elif target_path.endswith(".json"): mime_type = "application/json; charset=utf-8"
            elif target_path.endswith(".png"): mime_type = "image/png"
            elif target_path.endswith(".webp"): mime_type = "image/webp"
            elif target_path.endswith(".svg"): mime_type = "image/svg+xml"
            elif target_path.endswith(".ico"): mime_type = "image/x-icon"

            try:
                with open(target_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Error reading file: {e}")
        else:
            self.send_error(404, "File Not Found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body) if body else {}

        try:
            if url.path == "/api/config":
                cfg = load_config()
                if "client_id" in data:
                    cfg["client_id"] = data["client_id"].strip()
                if "client_secret" in data and data["client_secret"]:
                    cfg["client_secret"] = data["client_secret"].strip()
                save_config(cfg)
                self.send_json(200, {"success": True})

            elif url.path == "/api/import-report":
                cfg = load_config()
                code, fight_id, source_id = importer.extract_report_code(data.get("url_or_code", ""))
                if not code:
                    self.send_json(400, {"error": "Invalid report code or URL."})
                    return
                report = importer.fetch_report_summary(cfg["client_id"], cfg["client_secret"], code)
                self.send_json(200, {
                    "report_code": code,
                    "default_fight_id": fight_id,
                    "default_source_id": source_id,
                    "report": report
                })

            elif url.path == "/api/import-character":
                cfg = load_config()
                raw_code = data.get("url_or_code") or data.get("report_code") or ""
                code, default_fight, default_source = importer.extract_report_code(raw_code)
                if not code:
                    code = data.get("report_code") or ""
                fight_id = data.get("fight_id") or default_fight or 1
                player_id = data.get("player_id") or default_source
                player_name = data.get("player_name")

                if not code:
                    self.send_json(400, {"error": "Missing report code or URL."})
                    return

                char_data = importer.fetch_character_data(
                    cfg["client_id"], cfg["client_secret"], code, fight_id, player_id, player_name
                )
                generated = importer.generate_simc_profile(char_data, data.get("options", {}))
                self.send_json(200, {
                    "character_data": char_data,
                    "generated_profile": generated,
                    "generated_profile_components": generated
                })

            elif url.path == "/api/import-route":
                cfg = load_config()
                code, default_fight, _ = importer.extract_report_code(data.get("url_or_code", ""))
                fight_id = data.get("fight_id") or default_fight or 1
                scale_pct = float(data.get("scale_pct", 100.0))
                route_data = importer.fetch_dungeon_route(cfg["client_id"], cfg["client_secret"], code, fight_id, scale_pct)
                self.send_json(200, route_data)

            elif url.path == "/api/generate-profile":
                char_data = data.get("character_data", {})
                options = data.get("options", {})
                generated = importer.generate_simc_profile(char_data, options)
                self.send_json(200, generated)

            elif url.path == "/api/simulate":
                profile_text = data.get("profile_text", "")
                if not profile_text:
                    self.send_json(400, {"error": "Empty profile text."})
                    return

                sim_file = os.path.join(RUN_DIR, "custom_sim.simc")
                with open(sim_file, "w", encoding="utf-8") as f:
                    f.write(profile_text)

                html_file = os.path.join(RUN_DIR, "latest_sim.html")
                txt_file = os.path.join(RUN_DIR, "latest_sim.txt")

                simc_exe = os.path.join(RUN_DIR, "simc.exe")
                if not os.path.exists(simc_exe):
                    simc_exe = os.path.join(ROOT_DIR, "simc.exe")

                if not os.path.exists(simc_exe):
                    self.send_json(500, {"error": f"simc.exe not found at {simc_exe}."})
                    return

                cmd = [simc_exe, "custom_sim.simc", f"html=latest_sim.html", f"output=latest_sim.txt"]
                start_time = time.time()
                proc = subprocess.run(cmd, cwd=RUN_DIR, capture_output=True, text=True)
                elapsed = time.time() - start_time

                txt_content = ""
                if os.path.exists(txt_file):
                    try:
                        with open(txt_file, "r", encoding="utf-8", errors="ignore") as f:
                            txt_content = f.read()
                    except Exception:
                        pass

                mean_dps = 0.0
                m1 = re.search(r"DPS[=:]\s*([\d\.]+)", txt_content or proc.stdout)
                if m1:
                    mean_dps = float(m1.group(1))
                else:
                    m2 = re.search(r"DPS Ranking:\s*\n\s*([\d\.]+)", txt_content or proc.stdout)
                    if m2:
                        mean_dps = float(m2.group(1))

                self.send_json(200, {
                    "success": proc.returncode == 0,
                    "return_code": proc.returncode,
                    "elapsed_seconds": round(elapsed, 2),
                    "mean_dps": mean_dps,
                    "stdout": txt_content or proc.stdout,
                    "stderr": proc.stderr,
                    "has_html": os.path.exists(html_file)
                })

            elif url.path == "/api/save-hero-talents":
                icons_dir = os.path.join(UI_DIR, "static", "assets", "icons")
                os.makedirs(icons_dir, exist_ok=True)
                
                release_icons_dir = os.path.join(ROOT_DIR, "bin", "x64", "Release", "ui", "static", "assets", "icons")
                if os.path.exists(os.path.dirname(release_icons_dir)):
                    os.makedirs(release_icons_dir, exist_ok=True)
                    
                heroes = data.get("heroes", data)
                downloaded_count = 0
                
                for hero_name, hero_data in heroes.items():
                    tiers = hero_data.get("tiers", []) if isinstance(hero_data, dict) else []
                    for tier in tiers:
                        talents = tier.get("talents", []) if isinstance(tier, dict) else []
                        for tal in talents:
                            icon_url = tal.get("iconUrl", "")
                            if icon_url:
                                parsed = urllib.parse.urlparse(icon_url)
                                qs = urllib.parse.parse_qs(parsed.query)
                                raw_path = qs.get("url", [parsed.path])[0]
                                fname = os.path.basename(raw_path)
                                if not fname or fname == "/" or "." not in fname:
                                    fname = f"{tal.get('id', 'talent')}.webp"
                                
                                local_target = os.path.join(icons_dir, fname)
                                tal["localIcon"] = f"/assets/icons/{fname}"
                                
                                if not os.path.exists(local_target):
                                    try:
                                        full_dl_url = icon_url
                                        if icon_url.startswith("/"):
                                            full_dl_url = f"https://www.fellowsguide.com{icon_url}"
                                        req = urllib.request.Request(full_dl_url, headers={
                                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                            "Referer": "https://www.fellowsguide.com/tools/build-planner/"
                                        })
                                        with urllib.request.urlopen(req, timeout=10) as res:
                                            img_bytes = res.read()
                                            with open(local_target, "wb") as img_f:
                                                img_f.write(img_bytes)
                                            if os.path.exists(release_icons_dir):
                                                with open(os.path.join(release_icons_dir, fname), "wb") as img_f2:
                                                    img_f2.write(img_bytes)
                                            downloaded_count += 1
                                    except Exception as e:
                                        print(f"Error downloading {icon_url}: {e}")

                data_dir = os.path.join(UI_DIR, "static", "data")
                os.makedirs(data_dir, exist_ok=True)
                talents_json_path = os.path.join(data_dir, "talents_data.json")
                with open(talents_json_path, "w", encoding="utf-8") as f:
                    json.dump(heroes, f, indent=2)
                    
                release_data_dir = os.path.join(ROOT_DIR, "bin", "x64", "Release", "ui", "static", "data")
                if os.path.exists(os.path.dirname(release_data_dir)):
                    os.makedirs(release_data_dir, exist_ok=True)
                    with open(os.path.join(release_data_dir, "talents_data.json"), "w", encoding="utf-8") as f:
                        json.dump(heroes, f, indent=2)

                self.send_json(200, {
                    "success": True,
                    "downloaded_images": downloaded_count,
                    "heroes_saved": list(heroes.keys())
                })

            else:
                self.send_json(404, {"error": f"Unknown endpoint: {url.path}"})

        except Exception as e:
            self.send_json(500, {"error": str(e)})

    def send_json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        # Suppress noisy standard request logging to keep console clean
        pass

class ReusableThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

def open_browser_delayed():
    time.sleep(0.6)
    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except Exception:
        pass

def run_server():
    os.makedirs(os.path.join(UI_DIR, "static", "css"), exist_ok=True)
    os.makedirs(os.path.join(UI_DIR, "static", "js"), exist_ok=True)
    
    server_address = ('', PORT)
    try:
        with ReusableThreadingServer(server_address, FellowSimcHandler) as httpd:
            print(f"==================================================")
            print(f"  FellowSimc Web UI running at http://localhost:{PORT}")
            print(f"  Opening dashboard in your browser...")
            print(f"  Press Ctrl+C to stop the server")
            print(f"==================================================")
            threading.Thread(target=open_browser_delayed, daemon=True).start()
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down server.")
    except OSError as e:
        if getattr(e, 'winerror', None) == 10048 or "10048" in str(e) or "address already in use" in str(e).lower():
            print(f"==================================================")
            print(f"  FellowSimc Web UI is already running at http://localhost:{PORT}")
            print(f"  Opening dashboard in your browser...")
            print(f"==================================================")
            try:
                webbrowser.open(f"http://localhost:{PORT}")
            except Exception:
                pass
            try:
                input("\nPress Enter to close this window...")
            except Exception:
                pass
        else:
            raise e

if __name__ == "__main__":
    run_server()
