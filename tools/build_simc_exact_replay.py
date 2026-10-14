import json
import os
import sys

UI_DIR = r"d:\fellowsimc-main\ui"
if UI_DIR not in sys.path:
    sys.path.append(UI_DIR)

from importer import get_access_token, query_graphql

with open(r"d:\fellowsimc-main\ui\config.json", "r") as f:
    cfg = json.load(f)

token = get_access_token(cfg["client_id"], cfg["client_secret"])
report_code = "yMAZVJL9hTpFjqbC"
fight_id = 7
player_id = 1

q_meta = """query GetMeta($code: String!, $fightIDs: [Int]!) {
  reportData { report(code: $code) {
    fights(fightIDs: $fightIDs) { startTime endTime }
  }}}"""
res_m = query_graphql(token, q_meta, {"code": report_code, "fightIDs": [fight_id]})
fight = res_m["data"]["reportData"]["report"]["fights"][0]
f_start = fight["startTime"]
f_end = fight["endTime"]

q_casts = """query GetCasts($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData { report(code: $code) {
    events(fightIDs: [7], sourceID: 1, dataType: Casts, startTime: $startTime, endTime: $endTime, limit: 10000) {
      data nextPageTimestamp
    }}}}"""
all_casts = []
curr_t = f_start
while curr_t and curr_t < f_end:
    res_c = query_graphql(token, q_casts, {"code": report_code, "startTime": curr_t, "endTime": f_end})
    evs = res_c.get("data", {}).get("reportData", {}).get("report", {}).get("events", {})
    batch = evs.get("data", [])
    if not batch: break
    all_casts.extend([c for c in batch if c.get("type") == "cast" and not c.get("fake", False)])
    nxt = evs.get("nextPageTimestamp")
    if not nxt or nxt <= curr_t: break
    curr_t = nxt
all_casts.sort(key=lambda x: x["timestamp"])

gid_to_simc = {
    1020: "cold_snap",
    1029: "frost_bolt",
    1027: "freezing_torrent",
    2223: "talon_strike",
    2224: "rising_talons",
    1031: "bursting_ice",
    1558: "chronoshift",
    1009: "flight_of_the_navir",
    1023: "wrath_of_winter",
    1026: "winters_blessing",
    1032: "ice_blitz",
    1028: "glacial_blast",
    1018: "ice_comet",
}

action_lines = []
for i, c in enumerate(all_casts):
    gid = c.get("abilityGameID")
    s_name = gid_to_simc.get(gid)
    if not s_name: continue
    t_sec = (c["timestamp"] - f_start) / 1000.0
    action_lines.append(f"actions+=/{s_name},line_cd=9999,if=time>={t_sec:.1f}")

action_lines.append("actions+=/wait,sec=0.1")

simc_content = f"""# ====================================================================
# Exact 1:1 Combat Log Replay Profile - yMAZVJL9hTpFjqbC Fight 7
# Replaying Casts at Exact Timestamps (No Autonomous APL)
# ====================================================================

iterations=10000
seed=42
threads=12

fight_style=DungeonRoute
max_time=713
vary_combat_length=0.0
enemy="Apostate_Veras"
ignore_invulnerable_targets=1

# Pull 1: Spellbound Golem (Duration: 324s, Transit Delay: 9s)
raid_events+=/pull,pull=1,delay=009,enemies="PRIO_Spellbound_Golem_25":2480609|"Ice_Shardling_29":1364744|"Tundra_Stalker_21":6108894|"PRIO_Eldrin_Sentinel_23":4344640|"Eldrin_Recruit_19":26279057|"BOSS_Blade_of_Cithrel_20":11892798|"Large_Chicken_16":1869387|"Expedition_Lookout_26":900642|"Ice_Shardling_24":7188416|"Eldrin_Chronomancer_28":2474080|"Frozen_Remnant_27":3169957|"Coldheart_Assassin_30":1258616

# Pull 2: Ghorn the Avalanche (Duration: 186s, Transit Delay: 14s)
raid_events+=/pull,pull=2,delay=014,enemies="Eldrin_Recruit_19":24632160|"BOSS_Blade_of_Cithrel_20":11147482|"BOSS_Ghorn_the_Avalanche_31":4021972

# Pull 3: 叛教者维拉斯 (Duration: 160s, Transit Delay: 15s)
raid_events+=/pull,pull=3,delay=015,enemies="BOSS_Apostate_Veras_32":34237948

# Hero & Equipment
rime="sww"
level=80
weapon=chronoshift

gear_intellect=242
gear_stamina=535
gear_haste_rating=161
gear_expertise_rating=100
gear_crit_rating=141
gear_spirit=127
gear_armor=539

gems.sapphire_power=1500
gems.amethyst_power=625
gems.emerald_power=625

sets.torment_of_baelaurum=1
sets.drakheims_absolution=1
sets.seal_of_the_heskyr=1
sets.deaths_grasp=1

legendary.undulating_spirit=1

# Talents
talents=glacial_assault:1/navirs_keeper:1/cascading_blitz:1/greater_glacial_blast:1/bursting_swallows:1/biting_cold:1/icy_talons:1/burstbolter:1/chilling_finesse:1/wisdom_of_the_north:1

# STRICT 1:1 COMBAT LOG TIMELINE ACTIONS ({len(action_lines)} lines)
actions.precombat=snapshot_stats
{chr(10).join(action_lines)}
"""

simc_path = r"d:\fellowsimc-main\exact_timeline_replay.simc"
with open(simc_path, "w", encoding="utf-8") as f:
    f.write(simc_content)

print(f"Generated {simc_path} with {len(action_lines)} timeline actions.")
