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
import queue
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

BUILDS_DIR = os.path.join(ROOT_DIR, "builds")
os.makedirs(BUILDS_DIR, exist_ok=True)

class SimulationManager:
    def __init__(self):
        self.lock = threading.RLock()
        self.proc = None
        self.running = False
        self.start_time = 0.0
        self.log_history = []
        self.subscribers = set()
        self.last_result = None

    def is_running(self):
        with self.lock:
            if self.running and self.proc and self.proc.poll() is None:
                return True
            self.running = False
            return False

    def get_status(self):
        with self.lock:
            running = self.running and self.proc and self.proc.poll() is None
            if not running:
                self.running = False
            return {
                "running": running,
                "elapsed_seconds": round(time.time() - self.start_time, 2) if running else 0,
                "log_count": len(self.log_history),
                "last_result": self.last_result
            }

    def subscribe(self, q):
        with self.lock:
            self.subscribers.add(q)

    def unsubscribe(self, q):
        with self.lock:
            self.subscribers.discard(q)

    def broadcast(self, event_type, payload):
        with self.lock:
            if event_type == "log":
                self.log_history.append(payload)
                if len(self.log_history) > 250:
                    self.log_history.pop(0)
            elif event_type == "done":
                self.last_result = payload
                self.running = False

            for q in list(self.subscribers):
                try:
                    q.put_nowait((event_type, payload))
                except Exception:
                    pass

    def start_sim(self, profile_text, run_dir, root_dir):
        with self.lock:
            if self.running and self.proc and self.proc.poll() is None:
                return False, "A simulation is already running."

            self.running = True
            self.start_time = time.time()
            self.log_history = []
            self.last_result = None

            sim_file = os.path.join(run_dir, "custom_sim.simc")
            with open(sim_file, "w", encoding="utf-8") as f:
                f.write(profile_text)

            candidate_paths = [
                os.path.join(run_dir, "simc.exe"),
                os.path.join(root_dir, "simc.exe"),
                os.path.join(run_dir, "simc"),
                os.path.join(root_dir, "simc"),
                os.path.join(root_dir, "simc-engine", "bin", "x64", "Release", "simc.exe"),
                os.path.join(root_dir, "simc-engine", "simc.exe"),
                os.path.join(root_dir, "simc-engine", "build", "simc"),
                os.path.join(root_dir, "simc-engine", "engine", "simc"),
            ]
            simc_exe = next((p for p in candidate_paths if os.path.exists(p)), None)

            if not simc_exe:
                self.running = False
                return False, f"simc executable not found. Looked in {root_dir} and {os.path.join(root_dir, 'simc-engine')}."

            if not sys.platform.startswith("win") and simc_exe.lower().endswith(".exe"):
                cmd = ["wine", simc_exe, "custom_sim.simc", "html=latest_sim.html", "output=latest_sim.txt", "json2=latest_sim.json"]
            else:
                cmd = [simc_exe, "custom_sim.simc", "html=latest_sim.html", "output=latest_sim.txt", "json2=latest_sim.json"]
            try:
                self.proc = subprocess.Popen(cmd, cwd=run_dir, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            except Exception as e:
                self.running = False
                return False, f"Failed to start simc: {e}"

            worker = threading.Thread(target=self._worker_loop, args=(self.proc, run_dir, self.start_time), daemon=True)
            worker.start()
            return True, None

    def stop_sim(self):
        with self.lock:
            if self.running and self.proc:
                try:
                    self.proc.terminate()
                    self.proc.kill()
                except Exception:
                    pass
                self.running = False
                payload = {
                    "success": False,
                    "return_code": -1,
                    "elapsed_seconds": round(time.time() - self.start_time, 2),
                    "mean_dps": 0,
                    "players": [],
                    "report": "[Simulation stopped by user]",
                    "has_html": False,
                    "stopped": True
                }
                self.broadcast("done", payload)
                return True
            return False

    def _worker_loop(self, proc, run_dir, start_time):
        buf = ""
        while True:
            char = proc.stdout.read(1)
            if not char and proc.poll() is not None:
                if buf:
                    self.broadcast("log", {"text": buf, "eol": "\n"})
                break
            if char == "\r":
                if buf:
                    self.broadcast("log", {"text": buf, "eol": "\r"})
                    buf = ""
            elif char == "\n":
                if buf:
                    self.broadcast("log", {"text": buf, "eol": "\n"})
                    buf = ""
            else:
                buf += char

        with self.lock:
            if not self.running:
                return  # Was stopped manually

        elapsed = time.time() - start_time
        txt_file = os.path.join(run_dir, "latest_sim.txt")
        html_file = os.path.join(run_dir, "latest_sim.html")

        txt_content = ""
        if os.path.exists(txt_file):
            try:
                with open(txt_file, "r", encoding="utf-8", errors="ignore") as f:
                    txt_content = f.read()
            except Exception:
                pass

        mean_dps = 0.0
        players_list = []
        player_pattern = re.compile(
            r"Player:\s*([^\n\r]+?)\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+\d+\s*\n\s*DPS=([\d\.]+)(?:\s+DPS-Error=([\d\.]+)/([\d\.]+)%)?(?:\s+DPS-Range=([\d\.]+)/([\d\.]+)%)?",
            re.MULTILINE
        )
        for pm in player_pattern.finditer(txt_content):
            p_name = pm.group(1).strip()
            p_dps = float(pm.group(2))
            p_err = float(pm.group(3)) if pm.group(3) else 0.0
            p_err_pct = float(pm.group(4)) if pm.group(4) else 0.0
            p_range = float(pm.group(5)) if pm.group(5) else 0.0
            p_range_pct = float(pm.group(6)) if pm.group(6) else 0.0
            players_list.append({
                "name": p_name,
                "dps": p_dps,
                "error": p_err,
                "error_pct": p_err_pct,
                "range": p_range,
                "range_pct": p_range_pct
            })

        players_list.sort(key=lambda x: x["dps"], reverse=True)
        if players_list:
            mean_dps = players_list[0]["dps"]
        else:
            m1 = re.search(r"DPS[=:]\s*([\d\.]+)", txt_content)
            if m1:
                mean_dps = float(m1.group(1))
            else:
                m2 = re.search(r"DPS Ranking:\s*\n\s*([\d\.]+)", txt_content)
                if m2:
                    mean_dps = float(m2.group(1))

        done_payload = {
            "success": proc.returncode == 0,
            "return_code": proc.returncode,
            "elapsed_seconds": round(elapsed, 2),
            "mean_dps": mean_dps,
            "players": players_list,
            "report": txt_content,
            "has_html": os.path.exists(html_file)
        }
        self.broadcast("done", done_payload)

SIM_MANAGER = SimulationManager()

HERO_CLASS_KEYS = ["rime", "mara", "gunde", "elarion", "aeona", "ardeos", "tariq", "xavian", "vigor", "sylvie", "sune", "meiko", "mosse", "warmaster", "eldrane", "ink", "lisa"]

def parse_simc_file(filepath):
    """Parse a .simc file into a build dictionary."""
    filename = os.path.splitext(os.path.basename(filepath))[0]
    build = {
        "id": f"build_file_{filename}",
        "name": filename.replace("_", " "),
        "hero": "rime",
        "playerName": filename,
        "stats": {"primary": 100, "stamina": 0, "haste": 0, "expertise": 0, "crit": 0, "spirit": 0, "armor": 0},
        "selectedTalents": [],
        "weapon": "chronoshift",
        "legendary": "none",
        "activeSets": [],
        "gems": {},
        "traitCounts": {},
        "blessingCounts": {},
        "gearAffixes": [],
        "gearItemNames": {},
        "aplChoice": "base",
        "useCustomApl": False,
        "customAplText": "",
        "updatedAt": os.path.getmtime(filepath) * 1000,
        "filepath": filepath
    }
    
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("apl/heroes/"):
                parts = line.split("/")
                if len(parts) >= 3:
                    preset_file = parts[-1]
                    for choice in ["talons", "frostweaver", "soulfrost", "generic", "base"]:
                        if f"_{choice}_apl.simc" in preset_file:
                            build["aplChoice"] = choice
                            break
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip().lower()
                val = val.strip().strip('"').strip("'")
                
                if key in HERO_CLASS_KEYS:
                    build["hero"] = key
                    build["playerName"] = val
                    build["name"] = val
                elif key.startswith("gear_"):
                    stat_name = key[5:]
                    if stat_name in ["intellect", "agility", "strength"]:
                        try: build["stats"]["primary"] = int(val) + 100
                        except ValueError: pass
                    elif stat_name == "stamina":
                        try: build["stats"]["stamina"] = int(val)
                        except ValueError: pass
                    elif stat_name == "haste_rating":
                        try: build["stats"]["haste"] = int(val)
                        except ValueError: pass
                    elif stat_name == "expertise_rating":
                        try: build["stats"]["expertise"] = int(val)
                        except ValueError: pass
                    elif stat_name == "crit_rating":
                        try: build["stats"]["crit"] = int(val)
                        except ValueError: pass
                    elif stat_name == "spirit":
                        try: build["stats"]["spirit"] = int(val)
                        except ValueError: pass
                    elif stat_name == "armor":
                        try: build["stats"]["armor"] = int(val)
                        except ValueError: pass
                elif key.startswith("gems."):
                    g_type = key[5:].replace("_power", "")
                    try: build["gems"][g_type] = int(val)
                    except ValueError: pass
                elif key.startswith("sets."):
                    s_name = key[5:]
                    if val == "1":
                        if s_name not in build["activeSets"]:
                            build["activeSets"].append(s_name)
                    elif val == "0" and s_name in build["activeSets"]:
                        build["activeSets"].remove(s_name)
                elif key.startswith("legendary."):
                    if val == "1": build["legendary"] = key[10:]
                elif key == "weapon":
                    build["weapon"] = val
                elif key.startswith("weapon_trait."):
                    t_name = key[13:]
                    try: build["traitCounts"][t_name] = int(val)
                    except ValueError: pass
                elif key == "talents":
                    tals = [t.split(":")[0] for t in val.split("/") if t]
                    build["selectedTalents"] = tals
                elif key in ["head", "shoulder", "chest", "wrists", "hands", "legs", "feet", "finger1", "finger2", "neck", "back", "main_hand"]:
                    build["gearAffixes"].append(f"{key}={val}")
                    if "," in val:
                        item_part, aff_part = val.split(",", 1)
                        build["gearItemNames"][key] = item_part.strip()
                        if "affixes=" in aff_part:
                            affs_str = aff_part.replace("affixes=", "").strip()
                            for aff in affs_str.split("/"):
                                aff = aff.strip()
                                if aff:
                                    build["blessingCounts"][aff] = build["blessingCounts"].get(aff, 0) + 1
                    else:
                        build["gearItemNames"][key] = val.strip()
    return build

def load_all_local_builds():
    builds = []
    if not os.path.exists(BUILDS_DIR):
        return builds
        
    for fname in os.listdir(BUILDS_DIR):
        fpath = os.path.join(BUILDS_DIR, fname)
        if fname.endswith(".simc"):
            try:
                b_data = parse_simc_file(fpath)
                builds.append(b_data)
            except Exception:
                pass
    builds.sort(key=lambda x: x.get("updatedAt", 0), reverse=True)
    return builds

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
            client_id = (cfg.get("client_id") or "").strip()
            client_secret = (cfg.get("client_secret") or "").strip()
            self.send_json(200, {
                "client_id": client_id,
                "client_secret": client_secret,
                "has_secret": bool(client_secret),
                "is_configured": bool(client_id and client_secret)
            })
            return

        elif url.path == "/api/simulation/status":
            self.send_json(200, SIM_MANAGER.get_status())
            return

        elif url.path in ["/api/simulation/stream", "/api/simulate"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "close")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.close_connection = True

            def send_event(event_type, payload):
                try:
                    msg = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
                    self.wfile.write(msg.encode("utf-8"))
                    self.wfile.flush()
                except Exception:
                    return False
                return True

            with SIM_MANAGER.lock:
                for entry in list(SIM_MANAGER.log_history):
                    if not send_event("log", entry):
                        return
                if not SIM_MANAGER.is_running() and SIM_MANAGER.last_result:
                    send_event("done", SIM_MANAGER.last_result)
                    return

            client_queue = queue.Queue()
            SIM_MANAGER.subscribe(client_queue)
            try:
                while True:
                    try:
                        event_type, payload = client_queue.get(timeout=1.0)
                        if not send_event(event_type, payload):
                            break
                        if event_type == "done":
                            break
                    except queue.Empty:
                        if not SIM_MANAGER.is_running():
                            if SIM_MANAGER.last_result:
                                send_event("done", SIM_MANAGER.last_result)
                            break
            finally:
                SIM_MANAGER.unsubscribe(client_queue)
            return

        elif url.path == "/api/builds":
            builds = load_all_local_builds()
            self.send_json(200, {"builds": builds})
            return

        elif url.path in ["/api/report", "/test_report.html", "/latest_sim.html"]:
            report_path = os.path.join(RUN_DIR, "latest_sim.html")
            if not os.path.exists(report_path):
                report_path = os.path.join(ROOT_DIR, "latest_sim.html")
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
        body = self.rfile.read(length).decode('utf-8') if length > 0 else ""
        try:
            data = json.loads(body) if body and body.strip() else {}
        except Exception:
            data = {}

        try:
            if url.path == "/api/config":
                cfg = load_config()
                if "client_id" in data:
                    cfg["client_id"] = data["client_id"].strip()
                if "client_secret" in data and data["client_secret"]:
                    cfg["client_secret"] = data["client_secret"].strip()
                save_config(cfg)
                self.send_json(200, {"success": True})

            elif url.path == "/api/builds/save":
                raw_name = data.get("name", "Untitled_Build")
                clean_name = re.sub(r'[^a-zA-Z0-9_\-\ ]', '_', raw_name).strip()
                if not clean_name:
                    clean_name = "Untitled_Build"
                
                simc_content = data.get("simc_content", "")
                simc_path = os.path.join(BUILDS_DIR, f"{clean_name}.simc")
                if simc_content:
                    with open(simc_path, "w", encoding="utf-8") as f:
                        f.write(simc_content)

                self.send_json(200, {"success": True, "filename": clean_name, "simc_path": simc_path})

            elif url.path == "/api/builds/delete":
                raw_name = data.get("name", "")
                clean_name = re.sub(r'[^a-zA-Z0-9_\-\ ]', '_', raw_name).strip()
                if clean_name:
                    simc_path = os.path.join(BUILDS_DIR, f"{clean_name}.simc")
                    if os.path.exists(simc_path):
                        try: os.remove(simc_path)
                        except Exception: pass
                self.send_json(200, {"success": True})

            elif url.path == "/api/import-report":
                cfg = load_config()
                client_id = (cfg.get("client_id") or "").strip()
                client_secret = (cfg.get("client_secret") or "").strip()
                if not client_id or not client_secret:
                    self.send_json(400, {
                        "error": "FellowshipLogs API Key is not configured. Please configure your Client ID and Client Secret in API Settings to fetch combat logs.",
                        "error_type": "api_key_missing"
                    })
                    return
                code, fight_id, source_id = importer.extract_report_code(data.get("url_or_code", ""))
                if not code:
                    self.send_json(400, {"error": "Invalid report code or URL."})
                    return
                try:
                    report = importer.fetch_report_summary(client_id, client_secret, code)
                    self.send_json(200, {
                        "report_code": code,
                        "default_fight_id": fight_id,
                        "default_source_id": source_id,
                        "report": report
                    })
                except Exception as e:
                    err_str = str(e)
                    if "401" in err_str or "403" in err_str or "Unauthorized" in err_str:
                        self.send_json(401, {
                            "error": "FellowshipLogs API authentication failed. Please verify your Client ID and Client Secret in API Settings.",
                            "error_type": "api_key_invalid"
                        })
                    else:
                        self.send_json(500, {"error": f"Failed to fetch report from FellowshipLogs: {e}"})

            elif url.path == "/api/import-character":
                cfg = load_config()
                client_id = (cfg.get("client_id") or "").strip()
                client_secret = (cfg.get("client_secret") or "").strip()
                if not client_id or not client_secret:
                    self.send_json(400, {
                        "error": "FellowshipLogs API Key is not configured. Please configure your Client ID and Client Secret in API Settings to import character loadouts.",
                        "error_type": "api_key_missing"
                    })
                    return
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

                try:
                    char_data = importer.fetch_character_data(
                        client_id, client_secret, code, fight_id, player_id, player_name
                    )
                    generated = importer.generate_simc_profile(char_data, data.get("options", {}))
                    self.send_json(200, {
                        "character_data": char_data,
                        "generated_profile": generated,
                        "generated_profile_components": generated
                    })
                except Exception as e:
                    err_str = str(e)
                    if "401" in err_str or "403" in err_str or "Unauthorized" in err_str:
                        self.send_json(401, {
                            "error": "FellowshipLogs API authentication failed. Please verify your Client ID and Client Secret in API Settings.",
                            "error_type": "api_key_invalid"
                        })
                    else:
                        self.send_json(500, {"error": f"Failed to import character: {e}"})

            elif url.path == "/api/import-route":
                cfg = load_config()
                client_id = (cfg.get("client_id") or "").strip()
                client_secret = (cfg.get("client_secret") or "").strip()
                if not client_id or not client_secret:
                    self.send_json(400, {
                        "error": "FellowshipLogs API Key is not configured. Please configure your Client ID and Client Secret in API Settings to import dungeon routes.",
                        "error_type": "api_key_missing"
                    })
                    return
                code, default_fight, _ = importer.extract_report_code(data.get("url_or_code", ""))
                fight_id = data.get("fight_id") or default_fight or 1
                scale_pct = float(data.get("scale_pct", 100.0))
                try:
                    route_data = importer.fetch_dungeon_route(client_id, client_secret, code, fight_id, scale_pct)
                    self.send_json(200, route_data)
                except Exception as e:
                    self.send_json(500, {"error": f"Failed to import route: {e}"})

            elif url.path == "/api/generate-profile":
                char_data = data.get("character_data", {})
                options = data.get("options", {})
                generated = importer.generate_simc_profile(char_data, options)
                self.send_json(200, generated)

            elif url.path in ["/api/simulation/stop", "/api/simulate/stop"]:
                stopped = SIM_MANAGER.stop_sim()
                self.send_json(200, {"success": True, "stopped": stopped})
                return

            elif url.path == "/api/simulate":
                profile_text = data.get("profile_text", "")
                if not profile_text:
                    self.send_json(400, {"error": "Empty profile text."})
                    return

                if SIM_MANAGER.is_running():
                    self.send_json(200, {"status": "running", "already_running": True})
                    return

                ok, err = SIM_MANAGER.start_sim(profile_text, RUN_DIR, ROOT_DIR)
                if not ok:
                    self.send_json(500, {"error": err})
                    return

                self.send_json(200, {"status": "started"})
                return

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
    daemon_threads = True

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
        httpd = ReusableThreadingServer(server_address, FellowSimcHandler)
        httpd.daemon_threads = True
        print(f"==================================================")
        print(f"  FellowSimc Web UI running at http://localhost:{PORT}")
        print(f"  Opening dashboard in your browser...")
        print(f"  Press Ctrl+C to stop the server")
        print(f"==================================================")
        threading.Thread(target=open_browser_delayed, daemon=True).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
        finally:
            SIM_MANAGER.stop_sim()
            try:
                httpd.server_close()
            except Exception:
                pass
            os._exit(0)
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
