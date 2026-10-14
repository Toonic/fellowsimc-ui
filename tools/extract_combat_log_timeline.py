"""
tools/extract_combat_log_timeline.py
Extracts the exact 1:1 timeline of casts, dynamic enemy packs, enemy HP%,
and real log damage per cast from FellowshipLogs API for Fight 7 (sww, Rime).
"""

import json
import sys
import os
import re
from collections import defaultdict, Counter

UI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ui"))
if UI_DIR not in sys.path:
    sys.path.append(UI_DIR)

from importer import get_access_token, query_graphql, fetch_character_data
from report_utils import slugify_ability_name

NON_COMBAT_ABILITIES = {
    "Mount Brum the Winter Warmth",
    "Chickenize!",
    "Roll",
    "Grappling Arrow",
    "Celestial Veil",
    "Disrupt",
    "Sanctuary",
}

def resolve_simc_action(ability_name, hero_name=None):
    if not ability_name or ability_name in NON_COMBAT_ABILITIES:
        return None
    return slugify_ability_name(ability_name, hero_name=hero_name)

def extract_timeline(report_code="yMAZVJL9hTpFjqbC", fight_id=7, player_id=1, output_file="exact_replay_timeline.json"):
    print("=" * 80)
    print(f"EXTRACTING 1:1 TIMELINE: Report {report_code} | Fight {fight_id} | Player {player_id}")
    print("=" * 80)

    with open(os.path.join(UI_DIR, "config.json"), "r") as f:
        cfg = json.load(f)
    token = get_access_token(cfg["client_id"], cfg["client_secret"])

    # 1. Fetch Fight Bounds & Master Data
    print("[1/5] Fetching Fight Bounds & Master Data...")
    q_meta = """query GetMeta($code: String!, $fightIDs: [Int]!) {
      reportData {
        report(code: $code) {
          fights(fightIDs: $fightIDs) { startTime endTime name }
          masterData {
            actors { id name type subType }
            abilities { gameID name }
          }
        }
      }
    }"""
    res_m = query_graphql(token, q_meta, {"code": report_code, "fightIDs": [fight_id]})
    fight = res_m["data"]["reportData"]["report"]["fights"][0]
    f_start = fight["startTime"]
    f_end = fight["endTime"]
    duration_s = (f_end - f_start) / 1000.0

    actor_names = {a["id"]: a["name"] for a in res_m["data"]["reportData"]["report"]["masterData"]["actors"]}
    ability_names = {a["gameID"]: a["name"] for a in res_m["data"]["reportData"]["report"]["masterData"]["abilities"]}

    print(f"  Fight: {fight['name']} | Duration: {duration_s:.1f}s")

    # 2. Fetch Character Details
    print("[2/5] Fetching Character Snapshot...")
    char_data = fetch_character_data(cfg["client_id"], cfg["client_secret"], report_code, fight_id, player_id=player_id)
    if player_id is None and "player" in char_data and "id" in char_data["player"]:
        player_id = char_data["player"]["id"]
    player_obj = char_data.get("player", {})
    hero_class = player_obj.get("type", "Rime")
    hero_key = hero_class.lower()
    combatant_stats = player_obj.get("combatantInfo", {}).get("stats", {})

    if hero_key in ["rime", "aeona", "ardeos"]:
        primary_stat_name = "Intellect"
    elif hero_key in ["tariq", "xavian", "gunde"]:
        primary_stat_name = "Strength"
    elif hero_key in ["mara", "elarion"]:
        primary_stat_name = "Agility"
    else:
        primary_stat_name = "Intellect"

    primary_stat_val = combatant_stats.get(primary_stat_name, {}).get("min", 300) or 300
    intellect = primary_stat_val
    print(f"  Hero: {player_obj.get('name')} ({hero_class}, ID: {player_id}) | {primary_stat_name}: {primary_stat_val}")

    # 3. Fetch All Enemy Damage Taken (Global across all party members)
    print("[3/5] Indexing All Enemy Health & Lifetimes...")
    all_enemy_dmg = []
    curr_t = f_start
    q_dmg_taken = """query GetEnemyDmg($code: String!, $fightIDs: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(fightIDs: $fightIDs, dataType: DamageTaken, hostilityType: Enemies, startTime: $startTime, endTime: $endTime, limit: 10000) {
            data nextPageTimestamp
          }
        }
      }
    }"""
    while curr_t and curr_t < f_end:
        res_d = query_graphql(token, q_dmg_taken, {"code": report_code, "fightIDs": [fight_id], "startTime": curr_t, "endTime": f_end})
        evs = res_d.get("data", {}).get("reportData", {}).get("report", {}).get("events", {})
        batch = evs.get("data", [])
        if not batch:
            break
        all_enemy_dmg.extend(batch)
        nxt = evs.get("nextPageTimestamp")
        if not nxt or nxt <= curr_t:
            break
        curr_t = nxt

    print(f"  Total Enemy DamageTaken events: {len(all_enemy_dmg)}")

    mob_max_hp = defaultdict(float)
    mob_first_seen = defaultdict(lambda: float("inf"))
    mob_last_seen = defaultdict(lambda: 0.0)

    for d in all_enemy_dmg:
        key = (d["targetID"], d.get("targetInstance", 1))
        amt = d.get("amount", 0)
        t = d["timestamp"]
        mob_max_hp[key] += amt
        if t < mob_first_seen[key]:
            mob_first_seen[key] = t
        if t > mob_last_seen[key]:
            mob_last_seen[key] = t

    all_enemy_dmg.sort(key=lambda x: x["timestamp"])

    # 4. Fetch All Casts by Player
    print("[4/5] Fetching Player Cast Timeline...")
    all_casts = []
    curr_t = f_start
    q_casts = """query GetCasts($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(fightIDs: $fightIDs, sourceID: $sourceID, dataType: Casts, startTime: $startTime, endTime: $endTime, limit: 10000) {
            data nextPageTimestamp
          }
        }
      }
    }"""
    while curr_t and curr_t < f_end:
        res_c = query_graphql(token, q_casts, {"code": report_code, "fightIDs": [fight_id], "sourceID": player_id, "startTime": curr_t, "endTime": f_end})
        evs = res_c.get("data", {}).get("reportData", {}).get("report", {}).get("events", {})
        batch = evs.get("data", [])
        if not batch:
            break
        all_casts.extend(batch)
        nxt = evs.get("nextPageTimestamp")
        if not nxt or nxt <= curr_t:
            break
        curr_t = nxt

    # In FellowshipLogs, every completed cast has a type='cast' event without fake=True.
    # Spells with a cast time have a preceding type='begincast' event.
    # Instant cast spells only have type='cast'.
    # In FellowshipLogs, button press / activation attempts for cast-time spells have activation=True,
    # whereas completed casts omit activation=True.
    begincast_gids = {c["abilityGameID"] for c in all_casts if c.get("type") == "begincast"}
    casts_no_fake = [
        c for c in all_casts
        if not c.get("fake", False) and not (c.get("activation", False) and c["abilityGameID"] in begincast_gids)
    ]
    casts_no_fake.sort(key=lambda x: x["timestamp"])

    # Map begincast to its completion cast
    begincasts = defaultdict(list)
    for c in casts_no_fake:
        if c.get("type") == "begincast":
            begincasts[c["abilityGameID"]].append(c["timestamp"])

    deduped_casts = []
    for c in casts_no_fake:
        if c.get("type") == "cast":
            gid = c["abilityGameID"]
            end_t = c["timestamp"]
            # Look for a preceding begincast within 3.5s
            start_t = end_t
            if gid in begincasts and begincasts[gid]:
                # Find most recent begincast before end_t
                candidates = [t for t in begincasts[gid] if 0 <= end_t - t <= 3500]
                if candidates:
                    start_t = candidates[-1]
                    begincasts[gid].remove(start_t)

            deduped_casts.append({
                "start_timestamp": start_t,
                "end_timestamp": end_t,
                "abilityGameID": gid,
                "targetID": c.get("targetID", -1),
                "targetInstance": c.get("targetInstance", 1),
                "has_cast_time": (start_t != end_t)
            })

    deduped_casts.sort(key=lambda x: x["start_timestamp"])
    for i, c in enumerate(deduped_casts):
        c["index"] = i + 1
    print(f"  Total Verified Completed Casts: {len(deduped_casts)}")
    casts_by_time = deduped_casts

    # 4.5. Fetch Player Buff Events (Spirit Refunds & Buff States)
    print("[4.5/6] Fetching Player Buff Events (Spirit Refunds & Buff States)...")
    all_pbuffs = []
    curr_t = f_start
    q_pbuffs = """query GetPlayerBuffs($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(fightIDs: $fightIDs, sourceID: $sourceID, dataType: Buffs, startTime: $startTime, endTime: $endTime, limit: 10000) {
            data nextPageTimestamp
          }
        }
      }
    }"""
    while curr_t and curr_t < f_end:
        res_b = query_graphql(token, q_pbuffs, {"code": report_code, "fightIDs": [fight_id], "sourceID": player_id, "startTime": curr_t, "endTime": f_end})
        evs = res_b.get("data", {}).get("reportData", {}).get("report", {}).get("events", {})
        batch = evs.get("data", [])
        if not batch:
            break
        all_pbuffs.extend(batch)
        nxt = evs.get("nextPageTimestamp")
        if not nxt or nxt <= curr_t:
            break
        curr_t = nxt

    print(f"  Total Player Buff events: {len(all_pbuffs)}")

    # Track spirit refunds (Rising Spirit: GID 1003115)
    rising_spirit_refunds = [
        b["timestamp"] for b in all_pbuffs
        if b.get("abilityGameID") == 1003115 and b.get("type") in ("applybuff", "applybuffstack")
    ]
    cast_spirit_refund = defaultdict(bool)
    for r_t in rising_spirit_refunds:
        cands = [c for c in deduped_casts if c["start_timestamp"] <= r_t + 100 and (r_t - c["start_timestamp"]) <= 600]
        if cands:
            cast_spirit_refund[cands[-1]["index"]] = True

    # Track Glacial Assault (GID 1001377) state across time
    ga_events = sorted([b for b in all_pbuffs if b.get("abilityGameID") == 1001377], key=lambda x: x["timestamp"])
    cast_ga_max = defaultdict(bool)
    curr_ga_stack = 0
    ga_idx = 0
    for c in deduped_casts:
        c_t = c["start_timestamp"]
        while ga_idx < len(ga_events) and ga_events[ga_idx]["timestamp"] <= c_t:
            ev = ga_events[ga_idx]
            if ev.get("type") == "applybuff":
                curr_ga_stack = 1
            elif ev.get("type") == "applybuffstack":
                curr_ga_stack = ev.get("stack", curr_ga_stack + 1)
            elif ev.get("type") == "removebuff":
                curr_ga_stack = 0
            ga_idx += 1
        if curr_ga_stack >= 4:
            cast_ga_max[c["index"]] = True

    # 5. Fetch Player Damage Events
    print("[5/6] Fetching Player Damage Events & Attributing to Casts...")

    all_pdmg = []
    curr_t = f_start
    q_pdmg = """query GetPlayerDmg($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(fightIDs: $fightIDs, sourceID: $sourceID, dataType: DamageDone, startTime: $startTime, endTime: $endTime, limit: 10000) {
            data nextPageTimestamp
          }
        }
      }
    }"""
    while curr_t and curr_t < f_end:
        res_p = query_graphql(token, q_pdmg, {"code": report_code, "fightIDs": [fight_id], "sourceID": player_id, "startTime": curr_t, "endTime": f_end})
        evs = res_p.get("data", {}).get("reportData", {}).get("report", {}).get("events", {})
        batch = evs.get("data", [])
        if not batch:
            break
        all_pdmg.extend(batch)
        nxt = evs.get("nextPageTimestamp")
        if not nxt or nxt <= curr_t:
            break
        curr_t = nxt

    all_pdmg.sort(key=lambda x: x["timestamp"])
    print(f"  Total Player Damage Done events: {len(all_pdmg)}")


    # Cumulative damage tracker for dynamic enemy health
    dmg_ptr = 0
    cum_enemy_dmg = defaultdict(float)

    # Index casts by ability GID and name for exact preceding attribution
    casts_by_gid = defaultdict(list)
    casts_by_name = defaultdict(list)
    for c in casts_by_time:
        gid_c = c["abilityGameID"]
        casts_by_gid[gid_c].append(c)
        c_name = ability_names.get(gid_c, "")
        if c_name:
            casts_by_name[c_name.lower()].append(c)

    cast_hits = defaultdict(int)
    cast_dmg = defaultdict(float)
    cast_crits = defaultdict(int)
    cast_targets = defaultdict(set)

    ga_cleave_hits = defaultdict(int)
    ga_cleave_dmg = defaultdict(float)
    ga_cleave_targets = defaultdict(set)

    swallow_hits = defaultdict(int)
    swallow_dmg = defaultdict(float)

    proc_hits = defaultdict(int)
    proc_dmg = defaultdict(float)

    for d in all_pdmg:
        gid = d.get("abilityGameID")
        t = d["timestamp"]
        target_key = (d["targetID"], d.get("targetInstance", 1))
        amt = d.get("amount", 0)
        is_crit = (d.get("hitType") == 2)
        d_name = ability_names.get(gid, "").lower()

        # 1. Direct abilities matching cast GID
        if gid in casts_by_gid:
            candidates = [c for c in casts_by_gid[gid] if c["start_timestamp"] <= t]
            if candidates and (t - candidates[-1]["start_timestamp"] <= 6000):
                c = candidates[-1]
                idx = c["index"]
                cast_hits[idx] += 1
                cast_dmg[idx] += amt
                if is_crit: cast_crits[idx] += 1
                cast_targets[idx].add(target_key)
                continue

        # 2. Direct abilities matching cast by name
        if d_name and d_name in casts_by_name:
            candidates = [c for c in casts_by_name[d_name] if c["start_timestamp"] <= t]
            if candidates and (t - candidates[-1]["start_timestamp"] <= 6000):
                c = candidates[-1]
                idx = c["index"]
                cast_hits[idx] += 1
                cast_dmg[idx] += amt
                if is_crit: cast_crits[idx] += 1
                cast_targets[idx].add(target_key)
                continue

        # 3. Known secondary cleaves (Glacial Assault)
        if gid == 2023 or "glacial assault" in d_name:
            candidates = [c for c in casts_by_gid.get(2223, []) if c["start_timestamp"] <= t]
            if candidates and (t - candidates[-1]["start_timestamp"] <= 3500):
                c = candidates[-1]
                idx = c["index"]
                ga_cleave_hits[idx] += 1
                ga_cleave_dmg[idx] += amt
                ga_cleave_targets[idx].add(target_key)
                continue
            else:
                cands = [c for c in casts_by_time if c["start_timestamp"] <= t]
                if cands:
                    idx = cands[-1]["index"]
                    ga_cleave_hits[idx] += 1
                    ga_cleave_dmg[idx] += amt
                    ga_cleave_targets[idx].add(target_key)
                    continue

        # 4. Procs / Swallows (Frost Swallows)
        if gid in (1033, 1001365) or "frost swallow" in d_name:
            candidates = [c for c in casts_by_time if c["start_timestamp"] <= t]
            if candidates:
                idx = candidates[-1]["index"]
                swallow_hits[idx] += 1
                swallow_dmg[idx] += amt
                continue

        # 5. Fallback gear procs and passives
        candidates = [c for c in casts_by_time if c["start_timestamp"] <= t]
        if candidates:
            idx = candidates[-1]["index"]
            proc_hits[idx] += 1
            proc_dmg[idx] += amt

    timeline = []
    for i, c in enumerate(casts_by_time):
        idx = c["index"]
        gid = c["abilityGameID"]
        start_ts = c["start_timestamp"]
        end_ts = c["end_timestamp"]
        rel_start_t = (start_ts - f_start) / 1000.0
        rel_end_t = (end_ts - f_start) / 1000.0
        c_name = ability_names.get(gid, f"Ability_{gid}")
        target_id = c.get("targetID", -1)
        target_inst = c.get("targetInstance", 1)
        target_name = actor_names.get(target_id, "Environment / Area")

        simc_action = resolve_simc_action(c_name, hero_name=hero_class)

        # Advance enemy damage pointer up to start_ts
        while dmg_ptr < len(all_enemy_dmg) and all_enemy_dmg[dmg_ptr]["timestamp"] <= start_ts:
            ed = all_enemy_dmg[dmg_ptr]
            cum_enemy_dmg[(ed["targetID"], ed.get("targetInstance", 1))] += ed.get("amount", 0)
            dmg_ptr += 1

        # Identify all alive enemies at this timestamp
        alive_pack = []
        primary_hp_pct = None
        for key, max_hp in mob_max_hp.items():
            if mob_first_seen[key] <= start_ts <= (mob_last_seen[key] + 3000):
                rem_hp = max(0.0, max_hp - cum_enemy_dmg[key])
                pct = (rem_hp / max_hp * 100.0) if max_hp > 0 else 0.0
                if pct > 0.0 or (mob_last_seen[key] - start_ts) > 500:
                    m_id, m_inst = key
                    m_name = actor_names.get(m_id, f"NPC_{m_id}")
                    alive_pack.append({
                        "id": m_id,
                        "instance": m_inst,
                        "name": m_name,
                        "hp_pct": round(pct, 1)
                    })
                if key == (target_id, target_inst):
                    primary_hp_pct = round(pct, 1)

        # Ensure primary target is at index 0 of alive_pack
        if target_id != -1:
            for idx_m, mob in enumerate(alive_pack):
                if (mob["id"], mob["instance"]) == (target_id, target_inst):
                    alive_pack.insert(0, alive_pack.pop(idx_m))
                    break

        if primary_hp_pct is None:
            primary_hp_pct = alive_pack[0]["hp_pct"] if alive_pack else 100.0

        # Exact target count control
        if simc_action == "talon_strike":
            active_count = len(ga_cleave_targets[idx]) + 1 if ga_cleave_hits[idx] > 0 else 1
        elif simc_action in ("multishot", "starfall_volley", "bursting_ice", "chronoshift", "rising_talons", "infernal_wave", "fan_of_knives"):
            active_count = max(1, len(cast_targets[idx]))
        elif len(cast_targets[idx]) > 1:
            active_count = len(cast_targets[idx])
        else:
            active_count = 1

        timeline.append({
            "index": idx,
            "timestamp": round(rel_start_t, 3),
            "end_timestamp": round(rel_end_t, 3),
            "raw_start_timestamp": start_ts,
            "raw_end_timestamp": end_ts,
            "has_cast_time": c["has_cast_time"],
            "ability_id": gid,
            "ability_name": c_name,
            "simc_action": simc_action,
            "target_id": target_id,
            "target_name": target_name,
            "target_hp_pct": primary_hp_pct,
            "active_pack_count": active_count,
            "active_pack": alive_pack,
            "real_log_damage": cast_dmg[idx],
            "real_direct_damage": cast_dmg[idx],
            "real_log_hits": cast_hits[idx],
            "real_log_crits": cast_crits[idx],
            "ga_cleave_hits": ga_cleave_hits[idx],
            "ga_cleave_damage": ga_cleave_dmg[idx],
            "swallow_hits": swallow_hits[idx],
            "swallow_damage": swallow_dmg[idx],
            "proc_hits": proc_hits[idx],
            "proc_damage": proc_dmg[idx],
            "full_log_damage": cast_dmg[idx] + ga_cleave_dmg[idx] + swallow_dmg[idx] + proc_dmg[idx],
            "spirit_refund": bool(cast_spirit_refund[idx]),
            "glacial_assault_max": bool(cast_ga_max[idx] or (ga_cleave_hits[idx] > 0))
        })


    # 6. Fetch DamageDone and Buffs Summary Tables from API
    print("[6/6] Fetching Encounter Real Ability & Buff Summary Tables...")
    q_dmg_table = """query GetDamageSummary($code: String!, $fightIDs: [Int]!, $sourceID: Int!) {
      reportData {
        report(code: $code) {
          table(fightIDs: $fightIDs, sourceID: $sourceID, dataType: DamageDone)
        }
      }
    }"""
    res_dt = query_graphql(token, q_dmg_table, {"code": report_code, "fightIDs": [fight_id], "sourceID": player_id})
    dt_entries = res_dt.get("data", {}).get("reportData", {}).get("report", {}).get("table", {}).get("data", {}).get("entries", [])

    real_ability_summary = {}
    timeline_cast_counts = Counter(c["ability_name"] for c in timeline)

    for entry in dt_entries:
        name = entry.get("name")
        total = float(entry.get("total", 0))
        hits = int(entry.get("hitCount", 0)) + int(entry.get("tickCount", 0))
        uses = int(entry.get("uses", 0)) if entry.get("uses") is not None else 0
        crits = int(entry.get("critHitCount", 0)) + int(entry.get("critTickCount", 0))

        # Standardize ability name aliases
        if name == "Amethyst Splinter":
            name = "Amethyst Splinters"

        # Use actual verified completed casts from the combat log timeline if available
        if name in timeline_cast_counts:
            uses = timeline_cast_counts[name]

        if name not in real_ability_summary:
            real_ability_summary[name] = {
                "casts": uses,
                "hits": hits,
                "crits": crits,
                "dmg": total
            }
        else:
            real_ability_summary[name]["casts"] = uses
            real_ability_summary[name]["hits"] += hits
            real_ability_summary[name]["crits"] += crits
            real_ability_summary[name]["dmg"] += total


    q_buff_table = """query GetBuffSummary($code: String!, $fightIDs: [Int]!, $sourceID: Int!) {
      reportData {
        report(code: $code) {
          table(fightIDs: $fightIDs, sourceID: $sourceID, dataType: Buffs)
        }
      }
    }"""
    res_bt = query_graphql(token, q_buff_table, {"code": report_code, "fightIDs": [fight_id], "sourceID": player_id})
    bt_auras = res_bt.get("data", {}).get("reportData", {}).get("report", {}).get("table", {}).get("data", {}).get("auras", [])

    real_buff_summary = {}
    for aura in bt_auras:
        b_name = aura.get("name")
        total_uptime_ms = float(aura.get("totalUptime", 0))
        uptime_s = round(total_uptime_ms / 1000.0, 1)
        uptime_pct = round((total_uptime_ms / (duration_s * 1000.0)) * 100.0, 2) if duration_s > 0 else 0.0
        real_buff_summary[b_name] = [uptime_s, uptime_pct]

    total_real_log_dmg = sum(v["dmg"] for v in real_ability_summary.values())

    # Save output
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "report_code": report_code,
            "fight_id": fight_id,
            "player_id": player_id,
            "player_name": char_data["player"].get("name"),
            "hero_class": hero_class,
            "primary_stat_name": primary_stat_name,
            "primary_stat_value": primary_stat_val,
            "intellect": primary_stat_val,
            "duration_s": round(duration_s, 2),
            "total_log_damage": total_real_log_dmg,
            "real_ability_summary": real_ability_summary,
            "real_buff_summary": real_buff_summary,
            "total_casts": len(timeline),
            "timeline": timeline
        }, f, indent=2)

    print(f"\n[SUCCESS] Extracted {len(timeline)} cast actions with dynamic enemy packs to {output_file}!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extract 1:1 Combat Replay Timeline from FellowshipLogs")
    parser.add_argument("--code", type=str, default="yMAZVJL9hTpFjqbC", help="FellowshipLogs report code")
    parser.add_argument("--fight", type=int, default=7, help="Fight ID")
    parser.add_argument("--player", type=int, default=1, help="Player Actor ID")
    parser.add_argument("--output", type=str, default="exact_replay_timeline.json", help="Output JSON path")
    args = parser.parse_args()
    extract_timeline(report_code=args.code, fight_id=args.fight, player_id=args.player, output_file=args.output)
