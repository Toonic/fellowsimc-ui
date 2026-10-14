"""
tools/log_replayer.py - 1:1 Combat Log Replayer & Accuracy Evaluator
Directly replays every player cast from a FellowshipLogs combat report,
matches all enemies hit, evaluates SimC engine formulas, and compares real vs sim damage.
"""

import json
import sys
import os
import re
from datetime import datetime

# Add ui/ to sys.path for importer utilities
UI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ui"))
if UI_DIR not in sys.path:
    sys.path.append(UI_DIR)

from importer import get_access_token, query_graphql, fetch_character_data

def run_log_replay(report_code="yMAZVJL9hTpFjqbC", fight_id=7, player_id=1, output_html="replay_report.html"):
    print("=" * 80)
    print(f"Starting 1:1 Log Replayer for Report: {report_code} | Fight: {fight_id} | Player: {player_id}")
    print("=" * 80)

    # 1. Load API Config
    config_path = os.path.join(UI_DIR, "config.json")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found at {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    token = get_access_token(cfg["client_id"], cfg["client_secret"])

    # 2. Fetch Character Snapshot & Fight Info
    print("\n[1/5] Fetching Combatant Snapshot and Fight Bounds...")
    q_meta = """
    query GetMeta($code: String!, $fightIDs: [Int]!) {
      reportData {
        report(code: $code) {
          title
          fights(fightIDs: $fightIDs) {
            id
            name
            startTime
            endTime
            kill
          }
          masterData {
            actors { id name type subType }
            abilities { gameID name }
          }
        }
      }
    }
    """
    res_meta = query_graphql(token, q_meta, {"code": report_code, "fightIDs": [fight_id]})
    report_obj = res_meta["data"]["reportData"]["report"]
    fight = report_obj["fights"][0]
    f_start = fight["startTime"]
    f_end = fight["endTime"]
    duration_s = (f_end - f_start) / 1000.0

    actor_names = {a["id"]: a["name"] for a in report_obj["masterData"]["actors"]}
    ability_names = {a["gameID"]: a["name"] for a in report_obj["masterData"]["abilities"]}

    char_data = fetch_character_data(cfg["client_id"], cfg["client_secret"], report_code, fight_id, player_id=player_id)
    player_obj = char_data["player"]
    combatant_stats = player_obj.get("combatantInfo", {}).get("stats", {})

    intellect = combatant_stats.get("Intellect", {}).get("min", 342)
    spirit = combatant_stats.get("Spirit", {}).get("min", 127)
    spirit_pct = combatant_stats.get("SpiritPercent", {}).get("min", 2991) / 10000.0
    crit_pct = combatant_stats.get("CritPercent", {}).get("min", 2890) / 10000.0
    haste_pct = combatant_stats.get("HastePercent", {}).get("min", 2473) / 10000.0

    print(f"  Player: {player_obj.get('name')} (Rime) | Fight: {fight.get('name')} ({duration_s:.1f}s)")
    print(f"  Stats: {intellect} Intellect, {spirit} Spirit ({spirit_pct*100:.1f}%), {crit_pct*100:.1f}% Crit, {haste_pct*100:.1f}% Haste")

    # 3. Fetch All Casts
    print("\n[2/5] Fetching All Cast Events from Timeline...")
    all_casts = []
    curr_t = f_start
    q_casts = """
    query GetCasts($code: String!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(fightIDs: [7], sourceID: 1, dataType: Casts, startTime: $startTime, endTime: $endTime, limit: 1000) {
            data
            nextPageTimestamp
          }
        }
      }
    }
    """
    while curr_t and curr_t < f_end:
        res_c = query_graphql(token, q_casts, {"code": report_code, "startTime": curr_t, "endTime": f_end})
        evs = res_c.get("data", {}).get("reportData", {}).get("report", {}).get("events", {})
        batch = evs.get("data", [])
        if not batch:
            break
        all_casts.extend(batch)
        nxt = evs.get("nextPageTimestamp")
        if not nxt or nxt <= curr_t:
            break
        curr_t = nxt

    print(f"  Total Casts Loaded: {len(all_casts)}")

    # 4. Fetch All Damage Events
    print("\n[3/5] Fetching All Damage Events from Timeline...")
    q_dmg = """
    query GetDmg($code: String!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(fightIDs: [7], sourceID: 1, dataType: DamageDone, startTime: $startTime, endTime: $endTime, limit: 25000) {
            data
          }
        }
      }
    }
    """
    res_d = query_graphql(token, q_dmg, {"code": report_code, "startTime": f_start, "endTime": f_end})
    all_dmg = res_d.get("data", {}).get("reportData", {}).get("report", {}).get("events", {}).get("data", [])
    print(f"  Total Damage Events Loaded: {len(all_dmg)}")

    # Index damage events by timestamp for rapid temporal correlation
    all_dmg.sort(key=lambda x: x["timestamp"])

    # 5. Build 1:1 Cast Replay Correlation
    print("\n[4/5] Correlating 1:1 Casts with Enemies Hit and Evaluating Sim Formulas...")

    # Direct damage spell power multipliers
    SPELL_DIRECT_MAP = {
        1020: {"name": "Cold Snap", "coeff": 3.145, "procs_swallows": 5},
        2224: {"name": "Rising Talons", "coeff": 2.114, "is_multispike": True},
        2223: {"name": "Talon Strike", "coeff": 4.096, "is_multispike": True},
        1028: {"name": "Glacial Blast", "coeff": 10.24},
        1018: {"name": "Ice Comet", "coeff": 5.285},
        1029: {"name": "Frost Bolt", "coeff": 2.017},
        1027: {"name": "Freezing Torrent", "coeff": 1.4806},
        1031: {"name": "Bursting Ice", "coeff": 0.498 * 1.20},
        1558: {"name": "Chronoshift", "coeff": 2.402}
    }

    timeline_replay = []
    dmg_idx = 0
    total_dmg_events = len(all_dmg)

    for i, cast in enumerate(all_casts):
        cast_t = cast["timestamp"]
        rel_t = (cast_t - f_start) / 1000.0
        gid = cast.get("abilityGameID")
        cast_name = ability_names.get(gid, f"Ability_{gid}")
        target_id = cast.get("targetID", -1)
        target_name = actor_names.get(target_id, "Environment / Area")

        # Correlate damage events that strictly belong to this cast's ability
        correlated_dmg = []
        window_end = cast_t + 1500

        # Scan forward
        j = dmg_idx
        while j < total_dmg_events and all_dmg[j]["timestamp"] < cast_t:
            j += 1
        dmg_idx = j

        k = dmg_idx
        while k < total_dmg_events and all_dmg[k]["timestamp"] <= window_end:
            dev = all_dmg[k]
            d_gid = dev.get("abilityGameID")
            
            # Strict match: same ability ID
            if d_gid == gid:
                correlated_dmg.append(dev)
            elif gid == 1009 and d_gid in [1001365, 1033]:
                # Flight of the Navir swallows
                correlated_dmg.append(dev)
            k += 1

        # Real results for this cast
        real_total = sum(d.get("amount", 0) for d in correlated_dmg)
        real_hits = sum(1 for d in correlated_dmg if d.get("hitType") == 1)
        real_crits = sum(1 for d in correlated_dmg if d.get("hitType") == 2)
        enemies_hit = list(set(actor_names.get(d.get("targetID"), f"Enemy_{d.get('targetID')}") for d in correlated_dmg))

        # Sim Engine Expected Damage
        info = SPELL_DIRECT_MAP.get(gid)
        if info:
            base_coeff = info["coeff"]
            base_hit = base_coeff * intellect
            num_targets = max(1, len(enemies_hit)) if enemies_hit else 1
            
            # Multi-spikes for spenders (5 spikes per 5-orb spender)
            spikes = 5 if info.get("is_multispike") else 1
            
            # Expected hit damage per target
            expected_per_target_hit = base_hit * spikes
            expected_per_target_crit = expected_per_target_hit * 2.0
            
            # Expected overall damage based on real hit/crit distribution
            if real_hits + real_crits > 0:
                sim_expected = (real_hits * expected_per_target_hit + real_crits * expected_per_target_crit)
            else:
                sim_expected = expected_per_target_hit * num_targets * (1.0 + crit_pct)
        else:
            sim_expected = 0.0

        delta_pct = ((sim_expected - real_total) / real_total * 100.0) if real_total > 0 else 0.0

        timeline_replay.append({
            "index": i + 1,
            "time": round(rel_t, 2),
            "cast": cast_name,
            "target": target_name,
            "enemies_hit_count": len(enemies_hit),
            "enemies_hit": enemies_hit[:5],
            "real_hits": real_hits,
            "real_crits": real_crits,
            "real_damage": real_total,
            "sim_expected": round(sim_expected),
            "delta_pct": round(delta_pct, 1)
        })

    # 6. Generate Summary and Output
    print(f"\n[5/5] Replay Analysis Complete! Generating Report ({output_html})...")

    # Print first 20 casts to console
    print("\n" + "=" * 105)
    print(f"{'#':<4} | {'Time':<7} | {'Cast Ability':<20} | {'Primary Target':<22} | {'Enemies Hit':<12} | {'Real Dmg':<10} | {'Sim Dmg':<10} | {'Delta':<8}")
    print("-" * 105)
    for c in timeline_replay[:25]:
        target_display = (c['target'][:20] + "..") if len(c['target']) > 22 else c['target']
        delta_str = f"{c['delta_pct']:+.1f}%" if c['real_damage'] > 0 else "-"
        print(f"{c['index']:<4} | {c['time']:>5.1f}s | {c['cast']:<20} | {target_display:<22} | {c['enemies_hit_count']:>4} mobs   | {c['real_damage']:>10,d} | {c['sim_expected']:>10,d} | {delta_str:>8}")

    print("... [Remaining 850+ casts compiled in replay report] ...")
    print("=" * 105)

    # Save complete JSON
    json_path = os.path.splitext(output_html)[0] + ".json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "report_code": report_code,
            "fight_id": fight_id,
            "player": player_obj.get("name"),
            "duration": duration_s,
            "total_casts": len(timeline_replay),
            "timeline": timeline_replay
        }, f, indent=2)

    # Generate Standalone Interactive HTML Replay Viewer
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>1:1 Combat Replay - {player_obj.get('name')} | Fight {fight_id}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f1318; color: #e2e8f0; margin: 0; padding: 20px; }}
  h1, h2, h3 {{ color: #60a5fa; margin-top: 0; }}
  .header {{ background: #1a2230; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #2d3748; }}
  .meta-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }}
  .meta-item {{ background: #0f1318; padding: 12px; border-radius: 6px; border: 1px solid #2d3748; }}
  .meta-label {{ font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; }}
  .meta-val {{ font-size: 1.2rem; font-weight: bold; color: #f8fafc; margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9rem; }}
  th {{ background: #1e293b; color: #94a3b8; text-align: left; padding: 10px; border-bottom: 2px solid #334155; position: sticky; top: 0; }}
  td {{ padding: 10px; border-bottom: 1px solid #1e293b; }}
  tr:hover {{ background: #1e293b; }}
  .cast-name {{ font-weight: 600; color: #38bdf8; }}
  .target-name {{ color: #cbd5e1; }}
  .num {{ font-family: monospace; text-align: right; }}
  .delta-good {{ color: #4ade80; }}
  .delta-warn {{ color: #facc15; }}
  .delta-bad {{ color: #f87171; }}
  .filter-box {{ margin-bottom: 15px; display: flex; gap: 10px; }}
  .filter-input {{ background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px 12px; border-radius: 6px; width: 300px; }}
</style>
</head>
<body>
  <div class="header">
    <h1>1:1 Combat Replay & Validation Engine</h1>
    <p>Report: <strong>{report_code}</strong> | Encounter: <strong>{fight.get('name')}</strong> | Duration: <strong>{duration_s:.1f}s</strong></p>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Player</div><div class="meta-val">{player_obj.get('name')} (Rime)</div></div>
      <div class="meta-item"><div class="meta-label">Total Casts Replayed</div><div class="meta-val">{len(timeline_replay)}</div></div>
      <div class="meta-item"><div class="meta-label">Total Damage Events</div><div class="meta-val">{len(all_dmg):,}</div></div>
      <div class="meta-item"><div class="meta-label">Intellect / Spirit</div><div class="meta-val">{intellect} / {spirit}</div></div>
      <div class="meta-item"><div class="meta-label">Crit / Haste</div><div class="meta-val">{crit_pct*100:.1f}% / {haste_pct*100:.1f}%</div></div>
    </div>
  </div>

  <div class="filter-box">
    <input type="text" id="search" class="filter-input" placeholder="Filter by ability or target..." onkeyup="filterTable()">
  </div>

  <table id="replay-table">
    <thead>
      <tr>
        <th style="width: 50px;">#</th>
        <th style="width: 70px;">Time</th>
        <th>Cast Ability</th>
        <th>Primary Target</th>
        <th>Mobs Hit</th>
        <th class="num">Real Hits (Crits)</th>
        <th class="num">Real Damage</th>
        <th class="num">Sim Expected</th>
        <th class="num">Delta %</th>
      </tr>
    </thead>
    <tbody>
"""
    for c in timeline_replay:
        d_val = c['delta_pct']
        d_cls = "delta-good" if abs(d_val) <= 15.0 else ("delta-warn" if abs(d_val) <= 35.0 else "delta-bad")
        d_str = f"{d_val:+.1f}%" if c['real_damage'] > 0 else "-"
        enemies_preview = ", ".join(c['enemies_hit'][:3])
        if len(c['enemies_hit']) > 3:
            enemies_preview += f" (+{len(c['enemies_hit'])-3} more)"

        html_content += f"""      <tr>
        <td class="num">{c['index']}</td>
        <td class="num">{c['time']:.1f}s</td>
        <td class="cast-name">{c['cast']}</td>
        <td class="target-name">{c['target']}</td>
        <td>{c['enemies_hit_count']} ({enemies_preview})</td>
        <td class="num">{c['real_hits']} ({c['real_crits']})</td>
        <td class="num">{c['real_damage']:,}</td>
        <td class="num">{c['sim_expected']:,}</td>
        <td class="num {d_cls}">{d_str}</td>
      </tr>\n"""

    html_content += """    </tbody>
  </table>

  <script>
    function filterTable() {
      var input = document.getElementById("search").value.toLowerCase();
      var rows = document.getElementById("replay-table").getElementsByTagName("tr");
      for (var i = 1; i < rows.length; i++) {
        var text = rows[i].textContent.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
      }
    }
  </script>
</body>
</html>
"""
    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"\nSaved Interactive HTML Replay Viewer to: {os.path.abspath(output_html)}")
    print(f"Saved Replay JSON Data to: {os.path.abspath(json_path)}")
    print("=" * 80)
    return timeline_replay

if __name__ == "__main__":
    run_log_replay()
