"""
Standalone HTML Report Generator for FellowSimc Build Comparison Rankings.
Produces a single, self-contained, offline-capable HTML file that can be sent
to anyone without requiring the FellowSimc app or any server running.
"""

import os
import json
import re
import html
from collections import defaultdict
from datetime import datetime

try:
    from ui.report_utils import (
        format_number, clean_title, format_fl_amount, format_fl_avg,
        format_casts, format_hits, format_crit, load_css, aggregate_simc_stats,
        PHYSICAL_ABILITIES
    )
except ImportError:
    from report_utils import (
        format_number, clean_title, format_fl_amount, format_fl_avg,
        format_casts, format_hits, format_crit, load_css, aggregate_simc_stats,
        PHYSICAL_ABILITIES
    )


def parse_simc_actors(simc_text):
    """Splits custom_sim.simc into actor blocks keyed by actor name."""
    if not simc_text:
        return {}
    actors = {}
    cur_actor = None
    cur_lines = []
    
    for line in simc_text.splitlines():
        m = re.match(r'^(?:[a-zA-Z0-9_-]+|copy)="([^"]+)"', line)
        if m:
            if cur_actor:
                actors[cur_actor] = '\n'.join(cur_lines).strip()
            cur_actor = m.group(1)
            cur_lines = [line]
        elif cur_actor:
            cur_lines.append(line)
            
    if cur_actor:
        actors[cur_actor] = '\n'.join(cur_lines).strip()
        
    return actors

def extract_sim_data(run_dir, root_dir):
    """Extracts structured comparison data from latest_sim.json, custom_sim.simc, and latest_sim.txt."""
    candidate_json = [
        os.path.join(run_dir, "latest_sim.json"),
        os.path.join(root_dir, "latest_sim.json")
    ]
    json_path = next((p for p in candidate_json if os.path.exists(p)), None)

    candidate_simc = [
        os.path.join(run_dir, "custom_sim.simc"),
        os.path.join(root_dir, "custom_sim.simc")
    ]
    simc_path = next((p for p in candidate_simc if os.path.exists(p)), None)

    candidate_txt = [
        os.path.join(run_dir, "latest_sim.txt"),
        os.path.join(root_dir, "latest_sim.txt")
    ]
    txt_path = next((p for p in candidate_txt if os.path.exists(p)), None)

    simc_text = ""
    if simc_path:
        try:
            with open(simc_path, "r", encoding="utf-8", errors="ignore") as f:
                simc_text = f.read()
        except Exception:
            pass

    actors_simc = parse_simc_actors(simc_text)

    txt_text = ""
    if txt_path:
        try:
            with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
                txt_text = f.read()
        except Exception:
            pass

    # Global Sim Options & Defaults
    meta = {
        "title": "Build Comparison Rankings",
        "timestamp": datetime.now().strftime("%B %d, %Y • %I:%M %p"),
        "hero": "Hero",
        "fight_style": "Patchwerk",
        "duration": "360s",
        "iterations": "1000",
        "baseline_name": "Current_Editor"
    }

    # Extract meta from custom_sim.simc
    if simc_text:
        m_iters = re.search(r'iterations\s*=\s*(\d+)', simc_text)
        if m_iters: meta["iterations"] = f"{int(m_iters.group(1)):,}"
        m_style = re.search(r'fight_style\s*=\s*([a-zA-Z0-9_-]+)', simc_text)
        if m_style: meta["fight_style"] = clean_title(m_style.group(1))
        m_time = re.search(r'max_time\s*=\s*([\d\.]+)', simc_text)
        if m_time: meta["duration"] = f"{int(float(m_time.group(1)))}s"
        m_base = re.search(r'relative_difference_base\s*=\s*"([^"]+)"', simc_text)
        if m_base: meta["baseline_name"] = m_base.group(1)

    players_data = []

    # Priority 1: Parse from JSON
    if json_path:
        try:
            with open(json_path, "r", encoding="utf-8", errors="ignore") as f:
                sim_json = json.load(f)

            sim_obj = sim_json.get("sim", {})
            opt_obj = sim_obj.get("options", {})
            if opt_obj.get("iterations"):
                meta["iterations"] = f"{int(opt_obj['iterations']):,}"
            if opt_obj.get("fight_style"):
                meta["fight_style"] = clean_title(opt_obj["fight_style"])
            if opt_obj.get("max_time"):
                meta["duration"] = f"{int(float(opt_obj['max_time']))}s"
            if opt_obj.get("relative_difference_base"):
                meta["baseline_name"] = opt_obj["relative_difference_base"]

            raw_players = sim_obj.get("players", [])
            for p in raw_players:
                p_name = p.get("name", "Unknown")
                p_type = p.get("player_type", "")
                if p_type and (meta["hero"] == "Hero" or not meta["hero"]):
                    meta["hero"] = clean_title(p_type)

                cdata = p.get("collected_data", {})
                dps_obj = cdata.get("dps", {})
                mean_dps = float(dps_obj.get("mean", 0.0))
                min_dps = float(dps_obj.get("min", 0.0))
                max_dps = float(dps_obj.get("max", 0.0))
                mean_std_dev = float(dps_obj.get("mean_std_dev", 0.0))

                # Range & Error
                dps_range = max_dps - min_dps
                dps_range_pct = (dps_range / mean_dps * 100) if mean_dps > 0 else 0.0
                dps_err = mean_std_dev
                dps_err_pct = (dps_err / mean_dps * 100) if mean_dps > 0 else 0.0

                # Talents
                raw_talents = p.get("talents", "")
                talents_list = []
                if raw_talents:
                    for t_item in raw_talents.split('/'):
                        t_part = t_item.split(':')[0].strip()
                        if t_part:
                            talents_list.append(clean_title(t_part))

                # Buffed Stats
                buffed_stats = cdata.get("buffed_stats", {})
                attr_dict = buffed_stats.get("attribute", {})
                stat_dict = buffed_stats.get("stats", {})

                core_stats = {
                    "Agility": attr_dict.get("agility", 0),
                    "Strength": attr_dict.get("strength", 0),
                    "Intellect": attr_dict.get("intellect", 0),
                    "Stamina": attr_dict.get("stamina", 0),
                    "Spirit": attr_dict.get("spirit", 0),
                    "Armor": stat_dict.get("armor", 0),
                    "Haste": f"{stat_dict.get('haste_pct', 0) * 100:.1f}%" if "haste_pct" in stat_dict else "0.0%",
                    "Crit": f"{stat_dict.get('crit_pct', 0) * 100:.1f}%" if "crit_pct" in stat_dict else "0.0%",
                    "Mastery": f"{stat_dict.get('mastery_pct', 0) * 100:.1f}%" if "mastery_pct" in stat_dict else "0.0%",
                    "Versatility": f"{stat_dict.get('versatility_pct', 0) * 100:.1f}%" if "versatility_pct" in stat_dict else "0.0%",
                }
                core_stats = {k: v for k, v in core_stats.items() if v and v != 0 and v != "0" and v != "0.0%"}

                # Gear
                raw_gear = p.get("gear", {})
                gear_list = []
                for slot_name, item_info in raw_gear.items():
                    if isinstance(item_info, dict):
                        i_name = item_info.get("name", "")
                        encoded = item_info.get("encoded_item", "")
                        affixes = ""
                        if "affixes=" in encoded:
                            af_match = re.search(r'affixes=([a-zA-Z0-9_/]+)', encoded)
                            if af_match:
                                af_list = [clean_title(x) for x in af_match.group(1).split('/') if x]
                                affixes = ", ".join(set(af_list))
                        gear_list.append({
                            "slot": clean_title(slot_name),
                            "name": clean_title(i_name),
                            "affixes": affixes
                        })

                # Abilities / Damage Breakdown via aggregate_simc_stats
                sim_stats = aggregate_simc_stats(p, hero_name=meta.get("hero"))
                dur_str = str(meta.get("duration", "360s")).replace("s", "")
                duration_val = float(dur_str) if dur_str else 360.0
                tot_p_dmg = sum(v["dmg"] for v in sim_stats.values())
                abilities = []
                for a_name, a_val in sim_stats.items():
                    tot = a_val["dmg"]
                    if tot <= 0.0:
                        continue
                    dps_val = tot / duration_val if duration_val > 0 else 0.0
                    pct_val = (tot / tot_p_dmg * 100.0) if tot_p_dmg > 0 else 0.0
                    cr_pct = (a_val["crits"] / a_val["hits"] * 100.0) if a_val["hits"] > 0 else 0.0
                    avg_c = (tot / a_val["casts"]) if a_val["casts"] > 0 else 0.0
                    avg_h = (tot / a_val["hits"]) if a_val["hits"] > 0 else 0.0
                    abilities.append({
                        "name": a_name,
                        "raw_name": a_val["raw_name"],
                        "dps": dps_val,
                        "pct": pct_val,
                        "total": tot,
                        "casts": a_val["casts"],
                        "avg_cast": avg_c,
                        "hits": a_val["hits"],
                        "avg_hit": avg_h,
                        "crit_pct": cr_pct
                    })
                abilities.sort(key=lambda x: x["total"], reverse=True)

                # Buffs
                raw_buffs = p.get("buffs", [])
                buffs = []
                for b in raw_buffs:
                    uptime = float(b.get("uptime") or 0.0)
                    if uptime >= 0.5:
                        buffs.append({
                            "name": clean_title(b.get("name", "")),
                            "uptime": uptime
                        })
                buffs.sort(key=lambda x: x["uptime"], reverse=True)

                simc_code = actors_simc.get(p_name, "")

                players_data.append({
                    "name": p_name,
                    "display_name": clean_title(p_name),
                    "dps": mean_dps,
                    "min_dps": min_dps,
                    "max_dps": max_dps,
                    "range": dps_range,
                    "range_pct": dps_range_pct,
                    "error": dps_err,
                    "error_pct": dps_err_pct,
                    "talents": talents_list,
                    "core_stats": core_stats,
                    "gear": gear_list,
                    "abilities": abilities,
                    "buffs": buffs,
                    "simc_profile": simc_code
                })

        except Exception as e:
            print(f"Error parsing latest_sim.json: {e}")

    # Priority 2: Fallback to latest_sim.txt if JSON yielded no players
    if not players_data and txt_text:
        player_pattern = re.compile(
            r"Player:\s*([^\n\r]+?)\s+([^\s]+)\s+([^\s]+)\s+[^\s]+\s+\d+\s*\n\s*DPS=([\d\.]+)(?:\s+DPS-Error=([\d\.]+)/([\d\.]+)%)?(?:\s+DPS-Range=([\d\.]+)/([\d\.]+)%)?",
            re.MULTILINE
        )
        for pm in player_pattern.finditer(txt_text):
            p_name = pm.group(1).strip()
            p_hero = pm.group(3).strip()
            if p_hero and meta["hero"] == "Hero":
                meta["hero"] = clean_title(p_hero)
            p_dps = float(pm.group(4))
            p_err = float(pm.group(5)) if pm.group(5) else 0.0
            p_err_pct = float(pm.group(6)) if pm.group(6) else 0.0
            p_range = float(pm.group(7)) if pm.group(7) else 0.0
            p_range_pct = float(pm.group(8)) if pm.group(8) else 0.0

            players_data.append({
                "name": p_name,
                "display_name": clean_title(p_name),
                "dps": p_dps,
                "min_dps": p_dps - (p_range / 2),
                "max_dps": p_dps + (p_range / 2),
                "range": p_range,
                "range_pct": p_range_pct,
                "error": p_err,
                "error_pct": p_err_pct,
                "talents": [],
                "core_stats": {},
                "gear": [],
                "abilities": [],
                "buffs": [],
                "simc_profile": actors_simc.get(p_name, "")
            })

    # Sort players by DPS descending
    players_data.sort(key=lambda x: x["dps"], reverse=True)

    # Determine baseline player
    baseline_player = None
    baseline_target = meta["baseline_name"].lower().strip()
    
    for p in players_data:
        if p["name"].lower().strip() == baseline_target or p["display_name"].lower().strip() == baseline_target:
            baseline_player = p
            break
    if not baseline_player:
        for p in players_data:
            if "current_editor" in p["name"].lower() or "current editor" in p["display_name"].lower():
                baseline_player = p
                break
    if not baseline_player and players_data:
        baseline_player = players_data[-1]

    baseline_dps = baseline_player["dps"] if baseline_player else (players_data[0]["dps"] if players_data else 1.0)
    top_dps = players_data[0]["dps"] if players_data else 1.0

    # Enrich players with relative deltas & ranks
    for idx, p in enumerate(players_data):
        p["rank"] = idx + 1
        p["is_winner"] = (idx == 0)
        p["is_baseline"] = (p == baseline_player)
        
        diff = p["dps"] - baseline_dps
        p["diff_dps"] = diff
        p["diff_pct"] = (diff / baseline_dps * 100) if baseline_dps > 0 else 0.0
        p["bar_pct"] = max(12, min(100, round((p["dps"] / top_dps) * 100)))

    meta["baseline_player_name"] = baseline_player["display_name"] if baseline_player else "Baseline"
    meta["baseline_dps"] = baseline_dps
    meta["top_dps"] = top_dps
    meta["top_player_name"] = players_data[0]["display_name"] if players_data else "None"
    meta["max_gain_dps"] = top_dps - baseline_dps
    meta["max_gain_pct"] = ((top_dps - baseline_dps) / baseline_dps * 100) if baseline_dps > 0 else 0.0

    return meta, players_data

def generate_comparison_export_html(run_dir, root_dir, baseline_name=None):
    """Generates a complete, beautiful, standalone HTML report for Build Comparison Rankings."""
    meta, players = extract_sim_data(run_dir, root_dir)
    if baseline_name:
        meta["baseline_name"] = baseline_name

    if not players:
        return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FellowSimc • No Comparison Data</title>
  <style>
    body { background: #0f0f12; color: #ecedee; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #18181c; border: 1px solid #27272a; border-radius: 12px; padding: 32px; text-align: center; max-width: 460px; }
    h2 { color: #d4af6e; margin-top: 0; }
    p { color: #a1a1aa; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>No Comparison Data Found</h2>
    <p>Please run a simulation in <strong>Comparison Mode</strong> in the FellowSimc desktop app first to generate rankings and breakdown data.</p>
  </div>
</body>
</html>"""

    hero_key = meta["hero"].lower().replace(' ', '')
    hero_badge_class = f"badge-{hero_key}"

    # Build summary rows for Leaderboard
    leaderboard_rows_html = []
    for p in players:
        rank_class = "rank-gold" if p["rank"] == 1 else "rank-silver" if p["rank"] == 2 else "rank-bronze" if p["rank"] == 3 else "rank-default"
        bar_class = "gold-gradient" if p["is_winner"] or p["is_baseline"] else "blue-gradient"
        row_state_class = "winner" if p["is_winner"] else ("baseline-row" if p["is_baseline"] else "")

        if p["is_baseline"]:
            delta_badge = '<span class="dps-delta delta-baseline">BASELINE</span>'
        elif p["diff_dps"] > 0:
            delta_badge = f'<span class="dps-delta delta-pos">+{format_number(p["diff_dps"])} (+{p["diff_pct"]:.1f}%)</span>'
        elif p["diff_dps"] < 0:
            delta_badge = f'<span class="dps-delta delta-neg">{format_number(p["diff_dps"])} ({p["diff_pct"]:.1f}%)</span>'
        else:
            delta_badge = '<span class="dps-delta delta-zero">0 (0.0%)</span>'

        leaderboard_rows_html.append(f"""
        <div class="compare-row {row_state_class}" data-build-name="{html.escape(p['display_name'].lower())}">
          <div class="rank-badge {rank_class}">#{p['rank']}</div>
          <div class="bar-container">
            <div class="bar-header">
              <strong class="actor-title">{html.escape(p['display_name'])}</strong>
              <div class="dps-figures">
                <span class="dps-main">{format_number(p['dps'])} DPS</span>
                {delta_badge}
              </div>
            </div>
            <div class="bar-track">
              <div class="bar-fill {bar_class}" style="width: {p['bar_pct']}%;"></div>
            </div>
            <div class="bar-subtext">
              <span>Range: {format_number(p['range'])} DPS ({p['range_pct']:.1f}%)</span>
              <span>•</span>
              <span>Error: ±{format_number(p['error'])} DPS</span>
            </div>
          </div>
          <div class="row-actions">
            <a href="#build-detail-{p['rank']}" class="btn-jump-detail" onclick="expandAndScroll('build-detail-{p['rank']}'); return false;">
              <span>VIEW DETAILS</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </a>
          </div>
        </div>
        """)

    # Build deep dive detail cards for EACH build
    detail_cards_html = []
    for p in players:
        # Talents
        talents_html = ""
        if p["talents"]:
            talent_tags = "".join(f'<span class="talent-tag">{html.escape(t)}</span>' for t in p["talents"])
            talents_html = f"""
            <div class="detail-subsection">
              <h4>SELECTED TALENTS ({len(p['talents'])})</h4>
              <div class="talent-tags-container">{talent_tags}</div>
            </div>
            """

        # Stats
        stats_html = ""
        if p["core_stats"]:
            stat_items = "".join(
                f'<div class="stat-pill"><span class="stat-name">{html.escape(k)}</span><span class="stat-val">{html.escape(str(v))}</span></div>'
                for k, v in p["core_stats"].items()
            )
            stats_html = f"""
            <div class="detail-subsection">
              <h4>ATTRIBUTES & RATINGS</h4>
              <div class="stats-grid">{stat_items}</div>
            </div>
            """

        # Gear
        gear_html = ""
        if p["gear"]:
            gear_rows_list = []
            for g in p["gear"]:
                affix_span = f" <span class='gear-affix'>({html.escape(g['affixes'])})</span>" if g.get("affixes") else ""
                gear_rows_list.append(f'<tr><td class="gear-slot">{html.escape(g["slot"])}</td><td class="gear-item"><strong>{html.escape(g["name"])}</strong>{affix_span}</td></tr>')
            gear_rows = "".join(gear_rows_list)
            gear_html = f"""
            <div class="detail-subsection">
              <h4>EQUIPPED GEAR ({len(p['gear'])} SLOTS)</h4>
              <table class="report-table compact-table">
                <thead><tr><th>Slot</th><th>Item Name</th></tr></thead>
                <tbody>{gear_rows}</tbody>
              </table>
            </div>
            """

        # Ability Breakdown Table (FellowshipLogs Structure)
        abilities_html = ""
        if p["abilities"]:
            ab_rows = []
            tot_casts = sum(a['casts'] for a in p["abilities"])
            tot_hits = sum(a['hits'] for a in p["abilities"])
            tot_dmg = sum(a['total'] for a in p["abilities"])
            tot_dps = sum(a['dps'] for a in p["abilities"])
            tot_crits = sum(a['crit_pct'] * a['hits'] / 100.0 for a in p["abilities"])
            tot_crit_pct = (tot_crits / tot_hits * 100.0) if tot_hits > 0 else 0.0
            tot_avg_c = (tot_dmg / tot_casts) if tot_casts > 0 else 0.0
            tot_avg_h = (tot_dmg / tot_hits) if tot_hits > 0 else 0.0

            for a in p["abilities"]:
                ab_bar_w = max(4, min(100, round(a["pct"])))
                is_phys = a['name'] in PHYSICAL_ABILITIES
                name_cls = "text-physical" if is_phys else "text-magic"
                fill_cls = "physical-fill" if is_phys else "magic-fill"
                ab_rows.append(f"""
                <tr>
                  <td class="ability-name"><strong class="{name_cls}">{html.escape(a['name'])}</strong></td>
                  <td class="pct-cell" style="min-width: 150px;">
                    <div class="mini-bar-wrap">
                      <div class="mini-bar-fill {fill_cls}" style="width: {ab_bar_w}%;"></div>
                      <span class="mini-bar-left-pct">{a['pct']:.2f}%</span>
                      <span class="mini-bar-right-amt">{format_fl_amount(a['total'])}</span>
                    </div>
                  </td>
                  <td class="num">{format_casts(a['casts'])}</td>
                  <td class="num">{format_fl_avg(a['avg_cast'])}</td>
                  <td class="num">{format_hits(a['hits'])}</td>
                  <td class="num">{format_fl_avg(a['avg_hit'])}</td>
                  <td class="num">{format_crit(a['crit_pct'], a['hits'])}</td>
                  <td class="num"><strong>{format_number(a['dps'], 1)}</strong></td>
                </tr>
                """)
            abilities_html = f"""
            <div class="detail-subsection">
              <h4>DAMAGE BY ABILITY BREAKDOWN</h4>
              <div class="table-responsive">
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th style="min-width: 150px;">Amount</th>
                      <th class="num">Casts</th>
                      <th class="num">Avg Cast</th>
                      <th class="num">Hits</th>
                      <th class="num">Avg Hit</th>
                      <th class="num">Crit %</th>
                      <th class="num">DPS</th>
                    </tr>
                  </thead>
                  <tbody>{''.join(ab_rows)}</tbody>
                  <tfoot style="border-top: 2px solid var(--border-color); font-weight: bold; background: #141722;">
                    <tr>
                      <td><strong>Total</strong></td>
                      <td class="pct-cell">
                        <div class="mini-bar-wrap">
                          <div class="mini-bar-fill" style="width: 100%; background: #4b5563;"></div>
                          <span class="mini-bar-left-pct">100.0%</span>
                          <span class="mini-bar-right-amt">{format_fl_amount(tot_dmg)}</span>
                        </div>
                      </td>
                      <td class="num">{format_casts(tot_casts)}</td>
                      <td class="num">{format_fl_avg(tot_avg_c)}</td>
                      <td class="num">{format_hits(tot_hits)}</td>
                      <td class="num">{format_fl_avg(tot_avg_h)}</td>
                      <td class="num">{format_crit(tot_crit_pct, tot_hits)}</td>
                      <td class="num" style="color: var(--text-gold);"><strong>{format_number(tot_dps, 1)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            """


        # Buffs Table
        buffs_html = ""
        if p["buffs"]:
            buff_rows = []
            for b in p["buffs"][:12]:
                b_bar_w = max(2, min(100, round(b["uptime"])))
                buff_rows.append(f"""
                <tr>
                  <td><strong>{html.escape(b['name'])}</strong></td>
                  <td class="pct-cell">
                    <div class="mini-bar-wrap">
                      <div class="mini-bar-fill buff-fill" style="width: {b_bar_w}%;"></div>
                      <span class="mini-bar-text">{b['uptime']:.1f}%</span>
                    </div>
                  </td>
                </tr>
                """)
            buffs_html = f"""
            <div class="detail-subsection">
              <h4>KEY BUFF & AURA UPTIMES</h4>
              <div class="table-responsive">
                <table class="report-table compact-table">
                  <thead><tr><th>Buff Name</th><th>Uptime</th></tr></thead>
                  <tbody>{''.join(buff_rows)}</tbody>
                </table>
              </div>
            </div>
            """

        # SimC Profile Snippet
        simc_snippet_html = ""
        if p["simc_profile"]:
            simc_snippet_html = f"""
            <div class="detail-subsection">
              <details class="simc-code-details">
                <summary><span>View Simulationcraft Profile Code ({len(p['simc_profile'].splitlines())} lines)</span></summary>
                <div class="code-box-wrap">
                  <pre class="simc-code-block">{html.escape(p['simc_profile'])}</pre>
                </div>
              </details>
            </div>
            """

        rank_badge_class = "rank-gold" if p["rank"] == 1 else "rank-silver" if p["rank"] == 2 else "rank-bronze" if p["rank"] == 3 else "rank-default"
        delta_str = "BASELINE" if p["is_baseline"] else (f"+{format_number(p['diff_dps'])} DPS (+{p['diff_pct']:.1f}%)" if p["diff_dps"] > 0 else f"{format_number(p['diff_dps'])} DPS ({p['diff_pct']:.1f}%)")
        delta_color = "var(--gold-primary)" if p["is_baseline"] else ("#22c55e" if p["diff_dps"] > 0 else "#ef4444")

        detail_cards_html.append(f"""
        <div id="build-detail-{p['rank']}" class="detail-card {'winner-card' if p['is_winner'] else ''}" data-build-name="{html.escape(p['display_name'].lower())}">
          <div class="detail-card-header" onclick="toggleDetailCard('build-detail-{p['rank']}')">
            <div class="detail-header-left">
              <span class="rank-badge {rank_badge_class}">#{p['rank']}</span>
              <div>
                <h3 class="detail-build-title">{html.escape(p['display_name'])}</h3>
                <span class="detail-meta-line">Range: {format_number(p['min_dps'])} - {format_number(p['max_dps'])} DPS • Error: ±{format_number(p['error'])} DPS</span>
              </div>
            </div>
            <div class="detail-header-right">
              <div class="detail-dps-box">
                <span class="detail-dps-value">{format_number(p['dps'])} DPS</span>
                <span class="detail-delta-value" style="color: {delta_color};">{delta_str}</span>
              </div>
              <svg class="chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="detail-card-body">
            {talents_html}
            {stats_html}
            {gear_html}
            {abilities_html}
            {buffs_html}
            {simc_snippet_html}
          </div>
        </div>
        """)

    # Side-by-side overview matrix table
    matrix_rows = []
    for p in players:
        top_ab = p["abilities"][0]["name"] if p["abilities"] else "N/A"
        top_ab_pct = f"{p['abilities'][0]['pct']:.1f}%" if p["abilities"] else ""
        delta_disp = '<span class="matrix-baseline">BASELINE</span>' if p["is_baseline"] else (
            f'<span class="matrix-pos">+{format_number(p["diff_dps"])} (+{p["diff_pct"]:.1f}%)</span>' if p["diff_dps"] > 0 else
            f'<span class="matrix-neg">{format_number(p["diff_dps"])} ({p["diff_pct"]:.1f}%)</span>'
        )
        matrix_rows.append(f"""
        <tr class="{'matrix-winner' if p['is_winner'] else ''}" data-build-name="{html.escape(p['display_name'].lower())}">
          <td class="num"><strong>#{p['rank']}</strong></td>
          <td><a href="#build-detail-{p['rank']}" class="matrix-link" onclick="expandAndScroll('build-detail-{p['rank']}'); return false;"><strong>{html.escape(p['display_name'])}</strong></a></td>
          <td class="num"><strong>{format_number(p['dps'])}</strong></td>
          <td class="num">{delta_disp}</td>
          <td>{f"{len(p['talents'])} talents" if p['talents'] else "—"}</td>
          <td>{html.escape(top_ab)} {f'<small class="text-muted">({top_ab_pct})</small>' if top_ab_pct else ''}</td>
        </tr>
        """)

    # Discord summary markdown for clipboard copy
    discord_summary_lines = [
        f"**FellowSimc Build Comparison Rankings — {meta['hero']}**",
        f"*{meta['fight_style']} • {meta['duration']} • {meta['iterations']} Iterations*",
        ""
    ]
    for p in players[:10]:
        tag = "🏆 " if p["is_winner"] else ("📍 " if p["is_baseline"] else "   ")
        delta = "(BASELINE)" if p["is_baseline"] else (f"(+{p['diff_pct']:.1f}%)" if p["diff_dps"] > 0 else f"({p['diff_pct']:.1f}%)")
        discord_summary_lines.append(f"{tag}#{p['rank']:2d} | **{p['display_name']}** — {format_number(p['dps'])} DPS {delta}")
    if len(players) > 10:
        discord_summary_lines.append(f"...and {len(players) - 10} more builds.")
    discord_summary_text = "\\n".join(discord_summary_lines).replace('"', '\\"')
    css_content = load_css("comparison_report.css")

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FellowSimc Comparison Rankings • {html.escape(meta['hero'])}</title>
  <style>
{css_content}
  </style>
</head>
<body>

  <!-- Top Sticky Navbar -->
  <header class="top-navbar">
    <div class="brand-wrap">
      <div class="brand-logo">F</div>
      <div class="brand-text">
        <h1>FELLOWSIMC • BUILD COMPARISON RANKINGS</h1>
        <span>{html.escape(meta['hero'])} • {meta['fight_style']} • {meta['duration']} • {meta['iterations']} iters</span>
      </div>
      <span class="badge-hero {hero_badge_class}">{html.escape(meta['hero'])}</span>
    </div>
    <div class="header-actions">
      <button type="button" class="btn btn-secondary" onclick="copyDiscordSummary()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        <span>COPY SUMMARY</span>
      </button>
      <button type="button" class="btn btn-secondary" onclick="toggleAllDetails()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
        <span id="btn-toggle-all-text">EXPAND ALL</span>
      </button>
      <button type="button" class="btn btn-gold" onclick="downloadCurrentHtml()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>DOWNLOAD .HTML</span>
      </button>
    </div>
  </header>

  <!-- Main Body Content -->
  <main class="main-container">

    <!-- KPI Summary Row -->
    <div class="kpi-grid">
      <div class="kpi-card highlight">
        <span class="kpi-label">Top Ranked Build (#1)</span>
        <span class="kpi-val">{format_number(meta['top_dps'])} DPS</span>
        <span class="kpi-sub">{html.escape(meta['top_player_name'])}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Baseline Reference</span>
        <span class="kpi-val">{format_number(meta['baseline_dps'])} DPS</span>
        <span class="kpi-sub">{html.escape(meta['baseline_player_name'])}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Maximum Delta Gain</span>
        <span class="kpi-val" style="color: {'#22c55e' if meta['max_gain_dps'] > 0 else '#fff'};">
          {f"+{format_number(meta['max_gain_dps'])}" if meta['max_gain_dps'] > 0 else format_number(meta['max_gain_dps'])} DPS
        </span>
        <span class="kpi-sub">{f"+{meta['max_gain_pct']:.1f}% vs baseline" if meta['max_gain_dps'] > 0 else "0.0%"}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Simulated Configuration</span>
        <span class="kpi-val">{len(players)} Builds</span>
        <span class="kpi-sub">{meta['iterations']} Iters • {meta['duration']}</span>
      </div>
    </div>

    <!-- Section 1: Visual Leaderboard -->
    <section class="section-card">
      <div class="section-header">
        <div>
          <h2>BUILD COMPARISON LEADERBOARD</h2>
          <p>Side-by-side DPS rankings relative to top build ({format_number(meta['top_dps'])} DPS) with baseline delta.</p>
        </div>
      </div>
      <div class="filter-bar">
        <input type="text" id="build-search-input" class="search-input" placeholder="Search or filter builds by name..." oninput="filterBuilds(this.value)">
      </div>
      <div id="leaderboard-list-container" class="compare-list">
        {''.join(leaderboard_rows_html)}
      </div>
    </section>

    <!-- Section 2: Side-by-Side Summary Matrix -->
    <section class="section-card">
      <div class="section-header">
        <div>
          <h2>COMPARISON SUMMARY MATRIX</h2>
          <p>Quick lookup table of all builds, baseline deltas, and top damage contributors.</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="report-table" id="summary-matrix-table">
          <thead>
            <tr>
              <th class="num" style="width: 50px;">Rank</th>
              <th>Build Name</th>
              <th class="num">Mean DPS</th>
              <th class="num">vs Baseline</th>
              <th>Talents</th>
              <th>Top Ability</th>
            </tr>
          </thead>
          <tbody>
            {''.join(matrix_rows)}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 3: Deep Dive Breakdown per Build -->
    <section class="section-card">
      <div class="section-header">
        <div>
          <h2>DETAILED BUILD BREAKDOWN & ABILITY ANALYSIS</h2>
          <p>Full breakdown for each build including equipped items, talent setup, and ability-by-ability damage distribution.</p>
        </div>
      </div>
      <div style="padding: 18px 24px;">
        {''.join(detail_cards_html)}
      </div>
    </section>

  </main>

  <div id="toast-notice">Copied to clipboard!</div>

  <!-- Interactive Client-side Script -->
  <script>
    const DISCORD_SUMMARY = "{discord_summary_text}";

    function filterBuilds(query) {{
      const q = (query || "").toLowerCase().trim();
      document.querySelectorAll('.compare-row').forEach(row => {{
        const name = row.getAttribute('data-build-name') || '';
        row.style.display = (!q || name.includes(q)) ? 'flex' : 'none';
      }});
      document.querySelectorAll('#summary-matrix-table tbody tr').forEach(row => {{
        const name = row.getAttribute('data-build-name') || '';
        row.style.display = (!q || name.includes(q)) ? '' : 'none';
      }});
      document.querySelectorAll('.detail-card').forEach(card => {{
        const name = card.getAttribute('data-build-name') || '';
        card.style.display = (!q || name.includes(q)) ? 'block' : 'none';
      }});
    }}

    function toggleDetailCard(cardId) {{
      const card = document.getElementById(cardId);
      if (card) {{
        card.classList.toggle('open');
      }}
    }}

    function expandAndScroll(cardId) {{
      const card = document.getElementById(cardId);
      if (card) {{
        card.classList.add('open');
        card.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
      }}
    }}

    let allExpanded = false;
    function toggleAllDetails() {{
      allExpanded = !allExpanded;
      document.querySelectorAll('.detail-card').forEach(card => {{
        if (allExpanded) card.classList.add('open');
        else card.classList.remove('open');
      }});
      const txt = document.getElementById('btn-toggle-all-text');
      if (txt) txt.textContent = allExpanded ? 'COLLAPSE ALL' : 'EXPAND ALL';
    }}

    function showToast(msg) {{
      const t = document.getElementById('toast-notice');
      if (t) {{
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
      }}
    }}

    function copyDiscordSummary() {{
      if (navigator.clipboard && navigator.clipboard.writeText) {{
        navigator.clipboard.writeText(DISCORD_SUMMARY.replace(/\\\\n/g, '\\n')).then(() => {{
          showToast("Summary copied to clipboard!");
        }}).catch(() => {{
          fallbackCopyText(DISCORD_SUMMARY.replace(/\\\\n/g, '\\n'));
        }});
      }} else {{
        fallbackCopyText(DISCORD_SUMMARY.replace(/\\\\n/g, '\\n'));
      }}
    }}

    function fallbackCopyText(text) {{
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast("Summary copied to clipboard!");
    }}

    function downloadCurrentHtml() {{
      const htmlContent = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], {{ type: 'text/html;charset=utf-8' }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fellowsimc_comparison_${{new Date().toISOString().slice(0,10)}}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Downloaded HTML report!");
    }}
  </script>
</body>
</html>"""
    return full_html
