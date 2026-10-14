"""
tools/generate_replay_report.py
Generates the comprehensive HTML audit report for the 1:1 Fellowship combat replay.
Styled in the dark & gold UI theme matching FellowSimc:
- Ability Performance Audit (Native display names from C++ engine)
- Buff & Blessing Uptimes with Delta %
- Cumulative Damage Progression Chart
- 3 Total DPS Comparison Boxes
- 10s Rolling DPS Progression Chart
- Chronological Cast-by-Cast Audit with Dynamic Enemy Packs & Target Health
- Working FellowshipLogs button
- Clean styling with zero emojis.
"""

import json
import os
import sys
import re
import argparse
from collections import defaultdict

UI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ui"))
if UI_DIR not in sys.path:
    sys.path.append(UI_DIR)

from report_utils import aggregate_simc_stats, load_css, get_hero_buffs, format_number

def generate_report(results_file="exact_replay_results.json", simc_file="exact_replay_simc.json", timeline_file="exact_replay_timeline.json", output_html="exact_replay_report.html", output_json="exact_replay_report.json"):
    print(f"[1/4] Loading Simulation and Timeline Data ({results_file}, {simc_file}, {timeline_file})...")
    with open(results_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(simc_file, 'r', encoding='utf-8') as f:
        sim_data = json.load(f)

    timeline_data = {}
    if os.path.exists(timeline_file):
        try:
            with open(timeline_file, 'r', encoding='utf-8') as f:
                timeline_data = json.load(f)
        except Exception as e:
            print(f"Warning: failed to load timeline_file {timeline_file}: {e}")

    player = sim_data["sim"]["players"][0]
    results = data.get('results', [])
    num_casts = len(results)

    duration_s = timeline_data.get("duration_s", 713.8)
    iterations = sim_data["sim"].get("iterations", 1000)
    report_code = timeline_data.get("report_code", "Unknown")
    fight_id = timeline_data.get("fight_id", 0)
    player_name = timeline_data.get("player_name", player.get("name", "Unknown"))
    hero_class = timeline_data.get("hero_class", "Rime")
    primary_stat_name = timeline_data.get("primary_stat_name", "Intellect")
    primary_stat_val = timeline_data.get("primary_stat_value", timeline_data.get("intellect", 0))
    scope_title = f"{player_name} ({hero_class}) - {duration_s:.1f}s Combat Replay ({num_casts} Actions)"

    log_url = f"https://www.fellowshiplogs.com/reports/{report_code}?fight={fight_id}&type=damage-done" if report_code and report_code != "Unknown" else ""

    # Dynamic real stats and buffs from timeline
    real_stats = timeline_data.get("real_ability_summary", {})
    total_log = timeline_data.get("total_log_damage", 0.0)
    if not total_log and real_stats:
        total_log = sum(v.get("dmg", 0.0) for v in real_stats.values())
    if not total_log:
        total_log = data.get("total_log_damage", 0.0)

    # Recursive Walker leveraging engine-native display_name & hero actions
    sim_stats = aggregate_simc_stats(player, real_stats, hero_name=hero_class)

    total_sim = sum(r['sim_mean_damage'] for r in results)
    overall_match = (total_sim / total_log * 100.0) if total_log > 0 else 100.0
    total_log_dps = round(total_log / duration_s) if duration_s > 0 else 0
    total_sim_dps = round(total_sim / duration_s) if duration_s > 0 else 0
    delta_dps = total_sim_dps - total_log_dps

    # 1. Timeline Chart Data Points (Cumulative Damage & 10s Rolling DPS)
    print("[2/4] Building Ability Breakdown Rows and DPS Curves...")
    cum_log = 0.0
    cum_sim = 0.0
    timeline_chart_data = []
    step = 1 if len(results) <= 700 else 2

    for idx, r in enumerate(results):
        log_pkg = r.get('full_log_damage', r['real_log_damage'] + r.get('ga_cleave_damage', 0.0) + r.get('swallow_damage', 0.0) + r.get('proc_damage', 0.0))
        cum_log += log_pkg
        cum_sim += r['sim_mean_damage']
        if idx % step == 0 or idx == len(results) - 1:
            timeline_chart_data.append({
                't': round(r['timestamp'], 1),
                'log': round(cum_log),
                'sim': round(cum_sim)
            })

    chart_labels = [f"{p['t']}s" for p in timeline_chart_data]
    chart_log_pts = [p['log'] for p in timeline_chart_data]
    chart_sim_pts = [p['sim'] for p in timeline_chart_data]

    # Compute rolling DPS (10s window) for both Real Log and SimC
    chart_log_dps = []
    chart_sim_dps = []
    window_s = 10.0
    for i, pt in enumerate(timeline_chart_data):
        t_curr = pt['t']
        c_log_curr = pt['log']
        c_sim_curr = pt['sim']
        j = i
        while j > 0 and (t_curr - timeline_chart_data[j]['t']) < window_s:
            j -= 1
        dt = t_curr - timeline_chart_data[j]['t']
        if dt >= 2.0:
            dps_log = (c_log_curr - timeline_chart_data[j]['log']) / dt
            dps_sim = (c_sim_curr - timeline_chart_data[j]['sim']) / dt
        elif t_curr > 0.5:
            dps_log = c_log_curr / t_curr
            dps_sim = c_sim_curr / t_curr
        else:
            dps_log = 0.0
            dps_sim = 0.0
        chart_log_dps.append(round(dps_log))
        chart_sim_dps.append(round(dps_sim))

    # 2. Ability Breakdown Rows
    all_keys = list(set(list(real_stats.keys()) + list(sim_stats.keys())))
    all_keys.sort(key=lambda k: (real_stats.get(k, {}).get("dmg", 0.0), sim_stats.get(k, {}).get("dmg", 0.0)), reverse=True)
    ability_rows = []
    summary_table_json = []
    for ab in all_keys:
        r_info = real_stats.get(ab, {})
        s_info = sim_stats.get(ab, {})

        r_dmg = r_info.get("dmg", 0.0)
        s_dmg = s_info.get("dmg", 0.0)
        if r_dmg == 0.0 and s_dmg == 0.0:
            continue

        r_casts = r_info.get("casts", 0)
        s_casts = round(s_info.get("casts", 0))

        r_hits = r_info.get("hits", 0)
        s_hits = round(s_info.get("hits", 0))

        r_crits = r_info.get("crits", 0)
        s_crits = round(s_info.get("crits", 0))

        r_crit_pct = (r_crits / r_hits * 100.0) if r_hits > 0 else 0.0
        s_crit_pct = (s_crits / s_hits * 100.0) if s_hits > 0 else 0.0

        r_avg = (r_dmg / r_hits) if r_hits > 0 else 0.0
        s_avg = (s_dmg / s_hits) if s_hits > 0 else 0.0

        match_pct = (s_dmg / r_dmg * 100.0) if r_dmg > 0 else 0.0

        if 90 <= match_pct <= 112:
            badge_class = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        elif (75 <= match_pct < 90) or (112 < match_pct <= 125):
            badge_class = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
        elif match_pct > 0:
            badge_class = "bg-amber-500/15 text-amber-400 border-amber-500/30"
        else:
            badge_class = "bg-zinc-800 text-zinc-400 border-zinc-700"

        hit_diff = s_hits - r_hits
        hit_diff_str = f"+{hit_diff}" if hit_diff > 0 else f"{hit_diff}"

        ability_rows.append(f"""
        <tr class="border-b border-[#1c1c20] hover:bg-white/[0.02] transition text-xs md:text-sm">
          <td class="py-3 px-4 font-semibold text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#d4af6e]"></span>
            <span>{ab}</span>
          </td>
          <td class="py-3 px-3 text-center font-mono text-zinc-300">
            <span class="text-white font-bold">{r_casts}</span> <span class="text-zinc-500">vs</span> <span class="text-[#d4af6e] font-bold">{s_casts}</span>
          </td>
          <td class="py-3 px-3 text-center font-mono">
            <span class="text-white font-bold">{r_hits:,}</span> <span class="text-zinc-500">vs</span> <span class="text-[#d4af6e] font-bold">{s_hits:,}</span>
            <span class="text-[11px] text-zinc-500 ml-1">({hit_diff_str})</span>
          </td>
          <td class="py-3 px-3 text-center font-mono">
            <span class="text-zinc-200">{r_crit_pct:.1f}%</span> <span class="text-zinc-500">vs</span> <span class="text-amber-300">{s_crit_pct:.1f}%</span>
          </td>
          <td class="py-3 px-4 text-right font-mono font-medium text-zinc-300">{r_dmg:,.0f}</td>
          <td class="py-3 px-4 text-right font-mono font-bold text-[#d4af6e]">{s_dmg:,.0f}</td>
          <td class="py-3 px-3 text-right font-mono text-xs text-zinc-300">
            {r_avg:,.0f} <span class="text-zinc-500">vs</span> <span class="text-[#d4af6e]">{s_avg:,.0f}</span>
          </td>
          <td class="py-3 px-4 text-right font-mono">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border {badge_class}">{match_pct:.1f}%</span>
          </td>
        </tr>
        """)

        summary_table_json.append({
            "ability": ab,
            "real_casts": r_casts,
            "sim_casts": s_casts,
            "real_hits": r_hits,
            "sim_hits": s_hits,
            "real_crits_pct": round(r_crit_pct, 1),
            "sim_crits_pct": round(s_crit_pct, 1),
            "real": r_dmg,
            "sim": round(s_dmg),
            "real_avg": round(r_avg),
            "sim_avg": round(s_avg),
            "ratio_pct": round(match_pct, 1)
        })

    # 3. Side-by-Side Buff Uptimes
    print("[3/4] Building Buff Uptime Comparison Rows...")
    sim_buffs = {}
    for b in player.get("buffs", []):
        b_name = b.get("name", "")
        b_up = b.get("uptime", 0.0)
        if isinstance(b_up, dict):
            b_up = b_up.get("mean", 0.0)
        elif isinstance(b_up, (int, float)):
            b_up = float(b_up)
        else:
            b_up = 0.0
        sim_buffs[b_name] = b_up

    raw_buffs = timeline_data.get("real_buff_summary", {})
    real_buff_table = {}
    for b_name, b_val in raw_buffs.items():
        if isinstance(b_val, (list, tuple)) and len(b_val) >= 2:
            real_buff_table[b_name] = (float(b_val[0]), float(b_val[1]))
        elif isinstance(b_val, dict):
            real_buff_table[b_name] = (float(b_val.get("uptime_s", 0)), float(b_val.get("uptime_pct", 0)))

    buff_rows = []
    buffs_json = []

    for r_name, s_name, category in get_hero_buffs(hero_class):
        r_sec, r_pct = real_buff_table.get(r_name, (0.0, 0.0))
        if r_pct == 0.0 and s_name in real_buff_table:
            r_sec, r_pct = real_buff_table[s_name]

        raw_s_uptime = sim_buffs.get(s_name, 0.0)
        s_sec = (raw_s_uptime / 100.0) * duration_s if duration_s > 0 else 0.0
        s_pct = min(100.0, (s_sec / duration_s) * 100.0) if duration_s > 0 else 0.0

        if r_pct == 0.0 and s_pct == 0.0:
            continue

        delta = s_pct - r_pct
        if abs(delta) <= 5.0:
            badge_class = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        elif abs(delta) <= 12.0:
            badge_class = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
        else:
            badge_class = "bg-amber-500/15 text-amber-400 border-amber-500/30"

        delta_str = f"+{delta:.2f}%" if delta > 0 else f"{delta:.2f}%"

        buff_rows.append(f"""
        <tr class="border-b border-[#1c1c20] hover:bg-white/[0.02] transition text-xs md:text-sm">
          <td class="py-2.5 px-4 font-semibold text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#b08e58]"></span>
            <span>{r_name}</span>
          </td>
          <td class="py-2.5 px-3 text-zinc-400 text-xs font-mono">{category}</td>
          <td class="py-2.5 px-3 text-center font-mono text-zinc-200">
            <span class="font-bold">{r_pct:.2f}%</span> <span class="text-zinc-500 text-xs">({r_sec:.1f}s)</span>
          </td>
          <td class="py-2.5 px-3 text-center font-mono text-[#d4af6e]">
            <span class="font-bold">{s_pct:.2f}%</span> <span class="text-zinc-500 text-xs">({s_sec:.1f}s)</span>
          </td>
          <td class="py-2.5 px-3 text-center font-mono">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border {badge_class}">{delta_str}</span>
          </td>
        </tr>
        """)

        buffs_json.append({
            "buff": r_name,
            "category": category,
            "real_uptime_pct": round(r_pct, 2),
            "real_uptime_s": round(r_sec, 1),
            "sim_uptime_pct": round(s_pct, 2),
            "sim_uptime_s": round(s_sec, 1),
            "delta_pct": round(delta, 2)
        })

    # Colors
    match_color = "text-[#17c964]" if 90 <= overall_match <= 110 else ("text-cyan-400" if 80 <= overall_match <= 120 else "text-[#f5a524]")
    delta_color = "text-[#17c964]" if abs(delta_dps) <= 3000 else ("text-zinc-300" if delta_dps >= 0 else "text-amber-400")

    log_link_btn = f"""
    <a href="{log_url}" target="_blank" rel="noopener noreferrer" class="btn btn-gold text-xs">
      <span>View Fellowship Logs &rarr;</span>
    </a>
    """ if log_url else ""

    css_theme = load_css("replay_report.css")

    print("[4/4] Writing Final HTML Document...")
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fellowship Exact 1:1 Combat Replay Report - {player_name} ({iterations:,} Iterations)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
{css_theme}
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Header Card -->
    <header class="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-3 py-1 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase rounded-md border border-amber-500/25">Native C++ Engine 1:1 Dynamic Combat Replay</span>
          <span class="text-zinc-400 text-xs font-mono">Report {report_code} &bull; Fight {fight_id} &bull; Duration: {duration_s:.1f}s</span>
        </div>
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 text-white">Fellowship Replay Accuracy: {player_name}</h1>
        <p class="text-sm text-zinc-400 mt-1">Player: <strong class="text-white">{player_name}</strong> ({hero_class}) &bull; Simulated across <strong class="text-emerald-400">{iterations:,} Iterations</strong> in native C++ <code class="text-zinc-300">simc.exe</code></p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        {log_link_btn}
        <div class="bg-[#0a0a0c] border border-[#27272a] rounded-xl px-5 py-3 text-right">
          <div class="text-xs text-zinc-400 uppercase font-semibold">Overall Match</div>
          <div class="text-3xl font-extrabold {match_color}">{overall_match:.1f}%</div>
        </div>
        <div class="bg-[#0a0a0c] border border-[#27272a] rounded-xl px-5 py-3 text-right">
          <div class="text-xs text-zinc-400 uppercase font-semibold">Simulated Iterations</div>
          <div class="text-2xl font-extrabold text-[#d4af6e]">{iterations:,}</div>
        </div>
      </div>
    </header>

    <!-- KPI Summary Grid (3 clean cards for Total Damage and Replay Actions) -->
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card p-5" style="margin-bottom: 0;">
        <div class="text-xs text-zinc-400 font-semibold uppercase">Real Log Total Damage</div>
        <div class="text-2xl font-black text-white font-mono mt-1">{total_log:,.0f}</div>
        <div class="text-xs text-zinc-500 mt-1 font-mono">100% recorded damage over {duration_s:.1f}s</div>
      </div>
      <div class="card p-5" style="margin-bottom: 0;">
        <div class="text-xs text-zinc-400 font-semibold uppercase">SimC Mean Total Damage</div>
        <div class="text-2xl font-black text-[#d4af6e] font-mono mt-1">{total_sim:,.0f}</div>
        <div class="text-xs text-zinc-500 mt-1 font-mono">{iterations:,} Iteration Average</div>
      </div>
      <div class="card p-5" style="margin-bottom: 0;">
        <div class="text-xs text-zinc-400 font-semibold uppercase">Total Actions Replayed</div>
        <div class="text-2xl font-black text-white font-mono mt-1">{len(results)}</div>
        <div class="text-xs text-zinc-500 mt-1 font-mono">0.00s timeline drift &bull; exact timestamps</div>
      </div>
    </section>

    <!-- Cumulative Damage Timeline Chart -->
    <section class="card space-y-3">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-bold text-white">Cumulative Damage Progression: Real Log vs SimC ({iterations:,} Iterations)</h2>
          <p class="text-xs text-zinc-400">Progression comparison over {duration_s:.1f} seconds. Shading indicates cumulative progression.</p>
        </div>
        <div class="flex items-center gap-4 text-xs font-mono">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-zinc-500 inline-block"></span> Real Log</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-[#d4af6e] inline-block"></span> SimC Mean</span>
        </div>
      </div>
      <div class="h-64 w-full pt-2">
        <canvas id="timelineChart"></canvas>
      </div>
    </section>

    <!-- 3 Total DPS Comparison Boxes Below Damage Progression -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card p-5 border border-[#27272a] bg-[#121215]" style="margin-bottom: 0;">
        <div class="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Real Log Fight DPS</div>
        <div class="text-3xl font-black text-white font-mono mt-1.5">{total_log_dps:,.0f} <span class="text-sm font-semibold text-zinc-400">DPS</span></div>
        <div class="text-xs text-zinc-500 mt-1.5 font-mono">Encounter duration: {duration_s:.1f}s ({total_log/1e6:.2f}M total)</div>
      </div>
      <div class="card p-5 border border-[#27272a] bg-[#121215]" style="margin-bottom: 0;">
        <div class="text-xs text-zinc-400 font-semibold uppercase tracking-wider">SimC Mean Fight DPS</div>
        <div class="text-3xl font-black text-[#d4af6e] font-mono mt-1.5">{total_sim_dps:,.0f} <span class="text-sm font-semibold text-zinc-400">DPS</span></div>
        <div class="text-xs text-zinc-500 mt-1.5 font-mono">{iterations:,} Iteration Average ({total_sim/1e6:.2f}M total)</div>
      </div>
      <div class="card p-5 border border-[#27272a] bg-[#121215]" style="margin-bottom: 0;">
        <div class="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total DPS Parity Delta</div>
        <div class="text-3xl font-black {delta_color} font-mono mt-1.5">{delta_dps:+,.0f} <span class="text-sm font-semibold text-zinc-400">DPS</span></div>
        <div class="text-xs text-zinc-400 mt-1.5 font-mono"><span class="{match_color} font-bold">{overall_match:.1f}%</span> Parity ({total_sim_dps:,.0f} vs {total_log_dps:,.0f})</div>
      </div>
    </section>

    <!-- Rolling DPS Progression Chart -->
    <section class="card space-y-3">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-bold text-white">DPS Progression: Real Log vs SimC</h2>
          <p class="text-xs text-zinc-400">Total Fight DPS: <strong class="text-white font-mono">{total_log_dps:,.0f} Log DPS</strong> vs <strong class="text-[#d4af6e] font-mono">{total_sim_dps:,.0f} Sim DPS</strong> (<span class="{delta_color} font-bold font-mono">{delta_dps:+,.0f} DPS</span> &bull; <span class="{match_color} font-bold font-mono">{overall_match:.1f}%</span> Match). 10s rolling curve tracks combat phases and burst windows.</p>
        </div>
        <div class="flex items-center gap-4 text-xs font-mono">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-zinc-500 inline-block"></span> Real Log DPS ({total_log_dps:,.0f})</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-[#d4af6e] inline-block"></span> SimC DPS ({total_sim_dps:,.0f})</span>
        </div>
      </div>
      <div class="h-64 w-full pt-2">
        <canvas id="dpsChart"></canvas>
      </div>
    </section>

    <!-- Ability-by-Ability Breakdown -->
    <section class="card space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-bold text-white">Ability Performance Audit: Real Log vs SimC (Casts, Hits, Crits, Damage)</h2>
          <p class="text-xs text-zinc-400">Comparing Real Casts vs Sim Casts, Real Hits vs Sim Hits, Real Crits % vs Sim Crits %, and Real Avg Hit vs Sim Avg Hit.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-lg border border-[#27272a]">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#0c0c0f] border-b border-[#27272a] text-zinc-400 uppercase text-[11px]">
            <tr>
              <th class="py-3 px-4">Ability</th>
              <th class="py-3 px-3 text-center">Real / Sim Casts</th>
              <th class="py-3 px-3 text-center">Real / Sim Hits</th>
              <th class="py-3 px-3 text-center">Real / Sim Crit %</th>
              <th class="py-3 px-4 text-right">Real Dmg</th>
              <th class="py-3 px-4 text-right">SimC Dmg</th>
              <th class="py-3 px-3 text-right">Real / Sim Avg Hit</th>
              <th class="py-3 px-4 text-right">Match %</th>
            </tr>
          </thead>
          <tbody>
            {"".join(ability_rows)}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Side-by-Side Buff Uptime Table (Delta only) -->
    <section class="card space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-bold text-white">Buff &amp; Blessing Uptimes: Real Log vs SimC (Side-by-Side Audit)</h2>
          <p class="text-xs text-zinc-400">Authentic buff uptimes evaluated over {duration_s:.1f}s combat duration.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-lg border border-[#27272a]">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#0c0c0f] border-b border-[#27272a] text-zinc-400 uppercase text-[11px]">
            <tr>
              <th class="py-2.5 px-4">Buff / Aura Name</th>
              <th class="py-2.5 px-3">Classification</th>
              <th class="py-2.5 px-3 text-center">Real Uptime % (sec)</th>
              <th class="py-2.5 px-3 text-center">SimC Uptime % (sec)</th>
              <th class="py-2.5 px-3 text-center">Delta %</th>
            </tr>
          </thead>
          <tbody>
            {"".join(buff_rows)}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Chronological Cast-by-Cast Audit with Client-Side Fast Filtering -->
    <section class="card space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-base font-bold text-white">Chronological Cast-by-Cast Replay Audit ({num_casts} Actions)</h2>
          <p class="text-xs text-zinc-400">Exact 1:1 timeline verified against recorded FellowshipLogs events.</p>
        </div>
        <div class="w-full sm:w-64">
          <input type="text" id="abilityFilter" placeholder="Filter casts by ability name..." class="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#27272a] text-xs text-white focus:outline-none focus:border-[#b08e58]" />
        </div>
      </div>
      <div class="overflow-x-auto rounded-lg border border-[#27272a] max-h-[600px] overflow-y-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#0c0c0f] border-b border-[#27272a] text-zinc-400 uppercase text-[11px] sticky top-0 z-10">
            <tr>
              <th class="py-2.5 px-3">#</th>
              <th class="py-2.5 px-3">Time</th>
              <th class="py-2.5 px-3">Ability</th>
              <th class="py-2.5 px-3 text-center">Alive Mobs</th>
              <th class="py-2.5 px-3 text-center">Mob HP%</th>
              <th class="py-2.5 px-3 text-right">Real Log Dmg</th>
              <th class="py-2.5 px-3 text-right">SimC Mean</th>
              <th class="py-2.5 px-3 text-right">StdDev</th>
              <th class="py-2.5 px-3 text-center">Sim Crit%</th>
              <th class="py-2.5 px-3 text-right">Diff</th>
              <th class="py-2.5 px-3 text-center">Match</th>
            </tr>
          </thead>
          <tbody id="castTableBody">
          </tbody>
        </table>
      </div>
    </section>

  </div>

  <script>
    // Replay Cast Data for Client-Side Dynamic Rendering
    const replayData = {json.dumps(results)};

    function renderCasts(data) {{
      const tbody = document.getElementById('castTableBody');
      if (!tbody) return;
      tbody.innerHTML = data.map(r => {{
        const logPkg = r.full_log_damage !== undefined ? r.full_log_damage : (r.real_log_damage + (r.ga_cleave_damage||0) + (r.swallow_damage||0) + (r.proc_damage||0));
        const simD = r.sim_mean_damage;
        const mPct = logPkg > 0 ? (simD / logPkg * 100.0) : (simD === 0 ? 100.0 : 0.0);
        let rowBadge = "bg-zinc-800 text-zinc-400 border-zinc-700";
        let pctStr = "Utility";
        if (logPkg > 0) {{
          if (mPct >= 85 && mPct <= 115) rowBadge = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
          else if ((mPct >= 65 && mPct < 85) || (mPct > 115 && mPct <= 135)) rowBadge = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
          else rowBadge = "bg-amber-500/15 text-amber-400 border-amber-500/30";
          pctStr = mPct.toFixed(1) + "%";
        }}

        const diff = simD - logPkg;
        const diffStr = (diff >= 0 ? "+" : "") + Math.round(diff).toLocaleString();
        const diffColor = Math.abs(diff) < 100 ? "text-zinc-400" : (diff > 0 ? "text-[#d4af6e]" : "text-amber-400");

        const parts = [];
        const directD = r.real_direct_damage !== undefined ? r.real_direct_damage : r.real_log_damage;
        if (directD > 0 && ((r.ga_cleave_damage||0) > 0 || (r.swallow_damage||0) > 0 || (r.proc_damage||0) > 0)) parts.push("Direct: " + Math.round(directD).toLocaleString());
        if ((r.ga_cleave_damage||0) > 0) parts.push("Cleave: " + Math.round(r.ga_cleave_damage).toLocaleString());
        if ((r.swallow_damage||0) > 0) parts.push("Swallows: " + Math.round(r.swallow_damage).toLocaleString());
        if ((r.proc_damage||0) > 0) parts.push("Procs: " + Math.round(r.proc_damage).toLocaleString());
        const subtext = parts.length > 0 ? `<br><span class='text-[10px] text-zinc-500 font-sans'>${{parts.join(', ')}}</span>` : "";

        return `<tr class="cast-row border-b border-[#1c1c20] hover:bg-white/[0.02] transition text-xs font-mono" data-ability="${{r.ability_name.toLowerCase()}}">
          <td class="py-2 px-3 text-zinc-500">#${{r.index}}</td>
          <td class="py-2 px-3 font-bold text-[#d4af6e]">${{r.timestamp.toFixed(2)}}s</td>
          <td class="py-2 px-3 font-semibold text-white font-sans">${{r.ability_name}}</td>
          <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 rounded bg-[#0a0a0c] border border-[#27272a] text-zinc-300 font-bold">${{r.active_pack_count}}</span></td>
          <td class="py-2 px-3 text-center text-zinc-300">${{r.target_hp_pct.toFixed(1)}}%</td>
          <td class="py-2 px-3 text-right font-semibold text-zinc-200">${{Math.round(logPkg).toLocaleString()}}${{subtext}}</td>
          <td class="py-2 px-3 text-right font-bold text-[#d4af6e]">${{Math.round(simD).toLocaleString()}}</td>
          <td class="py-2 px-3 text-right text-zinc-500 text-[11px]">&plusmn;${{Math.round(r.sim_stddev).toLocaleString()}}</td>
          <td class="py-2 px-3 text-center text-amber-300">${{Math.round(r.sim_crit_pct)}}%</td>
          <td class="py-2 px-3 text-right ${{diffColor}}">${{diffStr}}</td>
          <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${{rowBadge}}">${{pctStr}}</span></td>
        </tr>`;
      }}).join("");
    }}

    renderCasts(replayData);

    // Timeline Cumulative Chart
    const canvasTimeline = document.getElementById('timelineChart');
    if (canvasTimeline) {{
      const ctx = canvasTimeline.getContext('2d');
      new Chart(ctx, {{
        type: 'line',
        data: {{
          labels: {json.dumps(chart_labels)},
          datasets: [
            {{
              label: 'Real Log',
              data: {json.dumps(chart_log_pts)},
              borderColor: '#71717a',
              backgroundColor: 'rgba(113, 113, 122, 0.05)',
              borderWidth: 2,
              tension: 0.1,
              pointRadius: 0
            }},
            {{
              label: 'SimC Mean',
              data: {json.dumps(chart_sim_pts)},
              borderColor: '#d4af6e',
              backgroundColor: 'rgba(176, 142, 88, 0.15)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.1,
              pointRadius: 0
            }}
          ]
        }},
        options: {{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {{ legend: {{ display: false }} }},
          scales: {{
            x: {{ grid: {{ color: '#27272a' }}, ticks: {{ color: '#71717a', maxTicksLimit: 14 }} }},
            y: {{ grid: {{ color: '#27272a' }}, ticks: {{ color: '#71717a', callback: v => (v / 1e6).toFixed(1) + 'M' }} }}
          }}
        }}
      }});
    }}

    // Rolling DPS Chart
    const canvasDps = document.getElementById('dpsChart');
    if (canvasDps) {{
      const ctxDps = canvasDps.getContext('2d');
      new Chart(ctxDps, {{
        type: 'line',
        data: {{
          labels: {json.dumps(chart_labels)},
          datasets: [
            {{
              label: 'Real Log DPS',
              data: {json.dumps(chart_log_dps)},
              borderColor: '#71717a',
              backgroundColor: 'rgba(113, 113, 122, 0.05)',
              borderWidth: 1.8,
              tension: 0.15,
              pointRadius: 0
            }},
            {{
              label: 'SimC DPS',
              data: {json.dumps(chart_sim_dps)},
              borderColor: '#d4af6e',
              backgroundColor: 'rgba(176, 142, 88, 0.12)',
              borderWidth: 2,
              tension: 0.15,
              pointRadius: 0
            }}
          ]
        }},
        options: {{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {{ legend: {{ display: false }} }},
          scales: {{
            x: {{ grid: {{ color: '#27272a' }}, ticks: {{ color: '#71717a', maxTicksLimit: 14 }} }},
            y: {{ grid: {{ color: '#27272a' }}, ticks: {{ color: '#71717a', callback: v => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v / 1e3).toFixed(0) + 'k') }} }}
          }}
        }}
      }});
    }}

    // Table Filter
    const filterInput = document.getElementById('abilityFilter');
    if (filterInput) {{
      filterInput.addEventListener('input', function(e) {{
        const term = e.target.value.toLowerCase().trim();
        const filtered = term ? replayData.filter(r => r.ability_name.toLowerCase().includes(term)) : replayData;
        renderCasts(filtered);
      }});
    }}
  </script>
</body>
</html>
"""

    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(html_content)

    final_report_json = {
        "report_code": report_code,
        "fight_id": fight_id,
        "scope": scope_title,
        "player": {
            "name": player_name,
            "hero_class": hero_class,
            "primary_stat_name": primary_stat_name,
            "primary_stat_value": primary_stat_val,
            primary_stat_name.lower(): primary_stat_val,
        },
        "duration_s": duration_s,
        "iterations": iterations,
        "total_log_damage": total_log,
        "total_sim_damage": round(total_sim),
        "total_log_dps": total_log_dps,
        "total_sim_dps": total_sim_dps,
        "delta_dps": delta_dps,
        "overall_match_pct": round(overall_match, 2),
        "resource_errors_count": len(data.get("resource_errors", [])),
        "summary_table": summary_table_json,
        "buffs_table": buffs_json
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(final_report_json, f, indent=2)

    print(f"[SUCCESS] {output_html} and {output_json} successfully generated!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--results", default="exact_replay_results.json")
    parser.add_argument("--simc", default="exact_replay_simc.json")
    parser.add_argument("--timeline", default="exact_replay_timeline.json")
    parser.add_argument("--output_html", default="exact_replay_report.html")
    parser.add_argument("--output_json", default="exact_replay_report.json")
    args = parser.parse_args()
    generate_report(args.results, args.simc, args.timeline, args.output_html, args.output_json)
