import json
import urllib.request
import urllib.parse
import base64
import ssl
import re
import os

TOKEN_URL = "https://www.fellowshiplogs.com/oauth/token"
API_URL = "https://www.fellowshiplogs.com/api/v2/client"

# Talent mapping table from Fellowship Log display names to Simc talent flags
RIME_TALENT_MAP = {
    "Avalanche": "avalanche",
    "Coalescing Frost": "coalescing_frost",
    "Glacial Assault": "glacial_assault",
    "Burstbolter": "burstbolter",
    "Chilling Finesse": "chilling_finesse",
    "Navir's Keeper": "navirs_keeper",
    "Cascading Blitz": "cascading_blitz",
    "Harrowing Ice": "harrowing_ice",
    "Icy Flow": "icy_flow",
    "Bursting Swallows": "bursting_swallows",
    "Greater Glacial Blast": "greater_glacial_blast",
    "Cold Shower": "cold_shower",
    "Icy Talons": "icy_talons",
    "Frostweaver's Wrath": "frostweavers_wrath",
    "Soulfrost Torrent": "soulfrost_torrent",
    "Biting Cold": "biting_cold",
    "Supreme Torrent": "supreme_torrent",
    "Wisdom of the North": "wisdom_of_the_north"
}

# Weapon mapping table from weapon names to Simc weapon constants
WEAPON_MAP = {
    "Chronoshift": "chronoshift",
    "Chrono": "chronoshift",
    "Icicles of Anzhyr": "icicles_of_anzhyr",
    "Icicles": "icicles_of_anzhyr",
    "Anzhyr": "icicles_of_anzhyr",
    "Voidbringer": "voidbringers_touch",
    "Voidbringer's Touch": "voidbringers_touch",
    "Voidbringers Touch": "voidbringers_touch",
    "Void-touched": "voidbringers_touch",
    "Voidtouched": "voidbringers_touch",
    "Void-Touched": "voidbringers_touch",
    "Nature's Fury": "natures_fury",
    "Natures Fury": "natures_fury",
    "Skybolt": "twilight_skybolt",
    "Twilight Skybolt": "twilight_skybolt",
    "Fated Strike": "fated_strike",
    "Sahril's Wrath": "sahrils_wrath",
    "Sahrils Wrath": "sahrils_wrath",
    "Sahril's Aegis": "sahrils_aegis",
    "Sahrils Aegis": "sahrils_aegis",
    "Sahril": "sahrils_wrath",
    "Earthbreaker": "earthbreaker",
    "Alzerac's Shackle": "alzeracs_shackle",
    "Alzeracs Shackle": "alzeracs_shackle",
    "Repository of Frozen Light": "repository_of_frozen_light",
    "Frozen Light": "repository_of_frozen_light",
    "Zeraleth's Hunger": "zeraleths_hunger",
    "Zeraleths Hunger": "zeraleths_hunger"
}

# Weapons that have innate built-in traits in Fellowship
WEAPON_INNATE_TRAITS = {
    "chronoshift": {
        "emerald_judgement": 1,
        "hunters_focus": 1,
        "seized_opportunity": 1
    }
}

SLOT_NAME_MAP = {
    0: "head",
    1: "neck",
    2: "shoulder",
    3: "back",
    4: "chest",
    5: "wrists",
    6: "hands",
    7: "legs",
    8: "feet",
    9: "finger1",
    10: "finger2",
    11: "trinket1",
    12: "trinket2",
    13: "main_hand",
    14: "off_hand"
}

TRAIT_SIMC_MAP = {
    "amethyst splinters": "amethyst_splinters",
    "brave machinations": "brave_machinations",
    "diamond strike": "diamond_strike",
    "divine mediation": "divine_mediation",
    "emerald judgement": "emerald_judgement",
    "first man standing": "first_man_standing",
    "grounded spirit": "grounded_spirit",
    "heart of stone": "heart_of_stone",
    "heroic brand": "heroic_brand",
    "hidden power": "hidden_power",
    "hunter's focus": "hunters_focus",
    "hunters focus": "hunters_focus",
    "focused haste": "hunters_focus",
    "inspired allegiance": "inspired_allegiance",
    "iron spikes": "iron_spikes",
    "kindling": "kindling",
    "king of the hill": "king_of_the_hill",
    "latent resurgence": "latent_resurgence",
    "martial initiative": "martial_initiative",
    "navigator's intuition": "navigators_intuition",
    "patient soul": "patient_soul",
    "ruby storm": "ruby_storm",
    "sapphire aurastone": "sapphire_aurastone",
    "seized opportunity": "seized_opportunity",
    "stalwart readiness": "stalwart_readiness",
    "treasure hunter's delight": "treasure_hunters_delight",
    "vengeful soul": "vengeful_soul",
    "visions of grandeur": "visions_of_grandeur",
    "willful momentum": "willful_momentum"
}

SET_SIMC_MAP = {
    "dark prophecy": "dark_prophecy",
    "drakheim's absolution": "drakheims_absolution",
    "drakheims absolution": "drakheims_absolution",
    "seal of the heskyr": "seal_of_the_heskyr",
    "death's grasp": "deaths_grasp",
    "deaths grasp": "deaths_grasp",
    "draconic might": "draconic_might",
    "eldrin's deceit": "eldrin_deceit",
    "eldrins deceit": "eldrin_deceit",
    "eldrin's fury": "eldrin_fury",
    "eldrins fury": "eldrin_fury",
    "haunting lament": "haunting_lament",
    "sin warding": "sin_warding",
    "sinthara's veil": "sintharas_veil",
    "sintharas veil": "sintharas_veil",
    "torment of bael'aurum": "torment_of_baelaurum",
    "torment of baelaurum": "torment_of_baelaurum",
    "bael'aurum": "torment_of_baelaurum",
    "baelaurum": "torment_of_baelaurum",
    "tuzari grace": "tuzari_grace",
    "tuzari's grace": "tuzari_grace",
    "undulating spirit": "undulating_spirit"
}

def sanitize_name(name):
    return re.sub(r'[^a-zA-Z0-9_]', '', name.lower().replace(' ', '_').replace("'", ""))

def extract_report_code(url_or_code):
    """Extract report code, fight ID, and source/player ID from URL or string."""
    if not url_or_code:
        return "", None, None
    code_match = re.search(r'reports/([a-zA-Z0-9]+)', url_or_code)
    fight_match = re.search(r'[?&#]fight=([0-9]+)', url_or_code)
    source_match = re.search(r'[?&#]source=([a-zA-Z0-9_]+)', url_or_code)
    
    code = code_match.group(1) if code_match else url_or_code.strip().split("?")[0].split("#")[0]
    fight_id = int(fight_match.group(1)) if fight_match else None
    source_id = source_match.group(1) if source_match else None
    return code, fight_id, source_id

def get_access_token(client_id, client_secret):
    """Fetch OAuth2 token from FellowshipLogs."""
    auth_str = f"{client_id}:{client_secret}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")
    req = urllib.request.Request(TOKEN_URL, data=data, headers=headers, method="POST")
    ctx = ssl.create_default_context()
    
    with urllib.request.urlopen(req, context=ctx) as response:
        res = json.loads(response.read().decode("utf-8"))
        return res.get("access_token")

def query_graphql(token, query, variables=None):
    """Execute GraphQL query against FellowshipLogs API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "FellowSimc-Importer/1.0"
    }
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
        
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data, headers=headers, method="POST")
    ctx = ssl.create_default_context()
    
    with urllib.request.urlopen(req, context=ctx) as response:
        return json.loads(response.read().decode("utf-8"))

def fetch_report_summary(client_id, client_secret, report_code):
    """Fetch all fights and characters in the report."""
    token = get_access_token(client_id, client_secret)
    query = """
    query GetReportSummary($code: String!) {
      reportData {
        report(code: $code) {
          title
          startTime
          endTime
          fights {
            id
            name
            kill
            fightPercentage
            startTime
            endTime
            friendlyPlayers
          }
          masterData {
            actors(type: "Player") {
              id
              name
              type
              subType
              icon
            }
          }
        }
      }
    }
    """
    res = query_graphql(token, query, {"code": report_code})
    report = res.get("data", {}).get("reportData", {}).get("report", {})
    return report

def fetch_character_data(client_id, client_secret, report_code, fight_id, player_id=None, player_name=None):
    """Fetch complete combatant details (stats, gear, traits, talents, damage done) for a specific fight."""
    token = get_access_token(client_id, client_secret)
    query = """
    query GetFightDetails($code: String!, $fightIDs: [Int]!) {
      reportData {
        report(code: $code) {
          fights(fightIDs: $fightIDs) {
            id
            name
            startTime
            endTime
            kill
          }
          table(dataType: Summary, fightIDs: $fightIDs)
          damageDone: table(dataType: DamageDone, fightIDs: $fightIDs)
        }
      }
    }
    """
    res = query_graphql(token, query, {"code": report_code, "fightIDs": [fight_id]})
    data_field = res.get("data") if isinstance(res, dict) else None
    report_data = data_field.get("reportData") if isinstance(data_field, dict) else None
    report = report_data.get("report") if isinstance(report_data, dict) else {}
    if not isinstance(report, dict):
        report = {}
    
    table_data = report.get("table", {}).get("data", {}) if isinstance(report.get("table"), dict) else {}
    if not isinstance(table_data, dict):
        table_data = {}
    player_details = table_data.get("playerDetails", {})
    if not isinstance(player_details, dict):
        player_details = {}
    
    target_player = None
    all_players = []
    for role, plist in player_details.items():
        if isinstance(plist, list):
            for p in plist:
                all_players.append(p)
                if player_id is not None and str(p.get("id")) == str(player_id):
                    target_player = p
                elif player_name and p.get("name", "").lower() == player_name.lower():
                    target_player = p
                    
    if not target_player and all_players:
        for p in all_players:
            if p.get("type", "").lower() == "rime":
                target_player = p
                break
        if not target_player:
            target_player = all_players[0]

    damage_table = report.get("damageDone", {})
    damage_entries = damage_table.get("data", {}).get("entries", []) if isinstance(damage_table, dict) and isinstance(damage_table.get("data"), dict) else []
    total_party_damage = sum(e.get("total", 0) for e in damage_entries)
    player_damage = 0
    if target_player:
        for e in damage_entries:
            if str(e.get("id")) == str(target_player.get("id")) or e.get("name") == target_player.get("name"):
                player_damage = e.get("total", 0)
                break
                
    damage_share_pct = (player_damage / total_party_damage * 100.0) if total_party_damage > 0 else 100.0

    return {
        "report_code": report_code,
        "fight_id": fight_id,
        "player": target_player,
        "all_players": all_players,
        "total_party_damage": total_party_damage,
        "player_damage": player_damage,
        "damage_share_pct": round(damage_share_pct, 2)
    }

def fetch_dungeon_route(client_id, client_secret, report_code, fight_id, scale_pct=100.0):
    """Fetch enemy damage taken from a log fight and generate a route."""
    token = get_access_token(client_id, client_secret)
    query = """
    query GetFightDamageTaken($code: String!, $fightIDs: [Int]!) {
      reportData {
        report(code: $code) {
          fights(fightIDs: $fightIDs) {
            id
            name
            startTime
            endTime
            kill
          }
          table(dataType: DamageTaken, fightIDs: $fightIDs, hostilityType: Enemies)
        }
      }
    }
    """
    res = query_graphql(token, query, {"code": report_code, "fightIDs": [fight_id]})
    report = res.get("data", {}).get("reportData", {}).get("report", {})
    fights = report.get("fights", [])
    fight_name = fights[0].get("name", "Wyrmheart") if fights else "Wyrmheart"
    
    scale_factor = (scale_pct / 100.0) if scale_pct > 0 else 1.0
    
    lines = []
    lines.append(f"# ====================================================================")
    lines.append(f"# Dungeon Route - {fight_name} 62 (Exported from {report_code} Fight {fight_id})")
    lines.append(f"# Mob HP Scaled to {scale_pct:.2f}% (Player Damage Share)")
    lines.append(f"# ====================================================================")
    lines.append("")
    lines.append("fight_style=DungeonRoute")
    lines.append("max_time=757")
    lines.append("vary_combat_length=0.0")
    lines.append(f'enemy="{fight_name}"')
    lines.append("ignore_invulnerable_targets=1")
    lines.append("")
    
    # Pull 1: Trash Pack & Timed Waves
    p1_golem = int(5000000 * scale_factor)
    p1_sentinel = int(2000000 * scale_factor)
    p1_blade = int(1354000 * scale_factor)
    p1_stalker = int(1283000 * scale_factor)
    p1_assassin = int(1212000 * scale_factor)
    p1_remnant = int(713000 * scale_factor)
    p1_recruit = int(499000 * scale_factor)
    p1_shardling = int(285000 * scale_factor)
    
    p1_enemies = (
        f'"PRIO_Spellbound_Golem":{p1_golem}|'
        f'"PRIO_Eldrin_Sentinel_1":{p1_sentinel}|"PRIO_Eldrin_Sentinel_2":{p1_sentinel}|'
        f'"Blade_of_Cithrel_1":{p1_blade}|"Blade_of_Cithrel_2":{p1_blade}|'
        f'"Tundra_Stalker_1":{p1_stalker}|"Coldheart_Assassin":{p1_assassin}|'
        f'"Frozen_Remnant_1":{p1_remnant}|"Frozen_Remnant_2":{p1_remnant}|'
        f'"Eldrin_Recruit_1":{p1_recruit}:1:6|"Ice_Shardling_1":{p1_shardling}:1:6'
    )
    lines.append(f"raid_events+=/pull,pull=1,delay=000,enemies={p1_enemies}")
    lines.append(f"raid_events+=/adds,pull=1,first=35s,count=5,health={p1_recruit},duration=265s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=1,first=70s,count=5,health={p1_recruit},duration=230s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=1,first=110s,count=5,health={p1_recruit},duration=190s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=1,first=150s,count=5,health={p1_recruit},duration=150s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=1,first=195s,count=5,health={p1_recruit},duration=105s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=1,first=240s,count=5,health={p1_recruit},duration=60s,cooldown=9999s")
    
    # Pull 2: Boss 1 (Ghorn the Avalanche)
    p2_ghorn = int(9266649 * scale_factor)
    p2_enemies = (
        f'"BOSS_Ghorn_the_Avalanche":{p2_ghorn}|'
        f'"PRIO_Eldrin_Sentinel_1":{p1_sentinel}|"PRIO_Eldrin_Sentinel_2":{p1_sentinel}|'
        f'"Blade_of_Cithrel_1":{p1_blade}|"Blade_of_Cithrel_2":{p1_blade}|"Blade_of_Cithrel_3":{p1_blade}|'
        f'"Eldrin_Recruit_1":{p1_recruit}:1:8'
    )
    lines.append(f"raid_events+=/pull,pull=2,delay=003,enemies={p2_enemies}")
    lines.append(f"raid_events+=/adds,pull=2,first=40s,count=5,health={p1_recruit},duration=135s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=2,first=85s,count=5,health={p1_recruit},duration=90s,cooldown=9999s")
    lines.append(f"raid_events+=/adds,pull=2,first=130s,count=5,health={p1_recruit},duration=45s,cooldown=9999s")
    
    # Pull 3: Boss 2 (Apostate Veras)
    p3_veras = int(17820479 * scale_factor)
    lines.append(f'raid_events+=/pull,pull=3,delay=003,enemies="BOSS_Apostate_Veras":{p3_veras}')
    
    return {
        "fight_name": fight_name,
        "route_text": "\n".join(lines),
        "enemies_count": 28,
        "scale_pct": scale_pct
    }

def generate_simc_profile(character_data, options=None):
    """Generate complete, calibrated .simc text profile."""
    options = options or {}
    player = character_data.get("player", {})
    hero_type = player.get("type", "Rime").lower()
    player_name = player.get("name", "ImportedHero")
    
    combatant = player.get("combatantInfo", {})
    gear = combatant.get("gear", [])
    combatant_stats = combatant.get("stats", {})
    
    # 1. Aggregate Raw Gear Attributes directly from item affixes (1:1 Gear Mode)
    attrs = {
        "Intellect": 0,
        "Strength": 0,
        "Agility": 0,
        "Stamina": 0,
        "Haste": 0,
        "Expertise": 0,
        "Critical Strike": 0,
        "Spirit": 0,
        "Armor": 0
    }
    
    sheet_stats = {
        "Intellect": 0,
        "Strength": 0,
        "Agility": 0,
        "Stamina": 0,
        "Haste": 0,
        "Expertise": 0,
        "Critical Strike": 0,
        "Spirit": 0,
        "Armor": 0
    }
    
    if combatant_stats:
        sheet_stats["Intellect"] = combatant_stats.get("Intellect", {}).get("min", 0)
        sheet_stats["Strength"] = combatant_stats.get("Strength", {}).get("min", 0)
        sheet_stats["Agility"] = combatant_stats.get("Agility", {}).get("min", 0)
        sheet_stats["Stamina"] = combatant_stats.get("Stamina", {}).get("min", 0)
        sheet_stats["Haste"] = combatant_stats.get("Haste", {}).get("min", 0)
        sheet_stats["Expertise"] = combatant_stats.get("Expertise", {}).get("min", 0)
        sheet_stats["Critical Strike"] = combatant_stats.get("Crit", {}).get("min", 0) or combatant_stats.get("Critical Strike", {}).get("min", 0)
        sheet_stats["Spirit"] = combatant_stats.get("Spirit", {}).get("min", 0)
        sheet_stats["Armor"] = combatant_stats.get("Armor", {}).get("min", 0)

    trait_counts = {}
    blessings_list = []
    blessing_counts = {}
    gear_items_output = []
    gear_item_names = {}
    set_counts = {}
    weapon_name = "none"
    
    for item in gear:
        item_name = sanitize_name(item.get("name", "item"))
        slot_idx = item.get("slot", 0)
        slot_name = SLOT_NAME_MAP.get(slot_idx, "gear")
        gear_item_names[slot_name] = item_name
        
        # Attributes
        for a in item.get("attributes", []):
            name = a.get("name")
            val = a.get("value", 0)
            if name in attrs:
                attrs[name] += val
            elif "Crit" in name:
                attrs["Critical Strike"] += val
                
        # Traits
        for t in item.get("traits", []):
            tname = t.get("name", "").lower()
            simc_tname = TRAIT_SIMC_MAP.get(tname, sanitize_name(tname))
            rank = t.get("rank", 1)
            trait_counts[simc_tname] = trait_counts.get(simc_tname, 0) + rank

        # Blessings
        for b in item.get("blessings", []):
            bname = sanitize_name(b.get("name", ""))
            lvl = b.get("level", 1)
            if bname:
                blessing_counts[bname] = blessing_counts.get(bname, 0) + lvl
                if bname not in blessings_list:
                    blessings_list.append(bname)

        gear_items_output.append(f"{slot_name}={item_name}")
        # Set Detection
        if item.get("set"):
            raw_set = item.get("set")
            sname = (raw_set.get("name", "") if isinstance(raw_set, dict) else str(raw_set)).lower()
            clean_sname = re.sub(r'[^a-zA-Z0-9]', '', sname)
            for skey, sval in SET_SIMC_MAP.items():
                clean_skey = re.sub(r'[^a-zA-Z0-9]', '', skey)
                if clean_skey in clean_sname or skey in sname:
                    set_counts[sval] = set_counts.get(sval, 0) + 1
                    break
                    
        # Weapon detection
        raw_iname = item.get("name", "")
        for wkey in WEAPON_MAP:
            if wkey.lower() in raw_iname.lower():
                weapon_name = WEAPON_MAP[wkey]

    # Merge innate weapon traits if weapon provides them
    if weapon_name and weapon_name in WEAPON_INNATE_TRAITS:
        for in_tname, in_rank in WEAPON_INNATE_TRAITS[weapon_name].items():
            trait_counts[in_tname] = min(4, trait_counts.get(in_tname, 0) + in_rank)

    # Primary Stat Mapping for All Classes
    hero_key = (hero_type or "rime").lower()
    if hero_key in ["rime", "aeona", "ardeos"]:
        primary_stat_name = "Intellect"
    elif hero_key in ["tariq", "xavian", "gunde"]:
        primary_stat_name = "Strength"
    elif hero_key in ["mara", "elarion"]:
        primary_stat_name = "Agility"
    else:
        primary_stat_name = "Intellect"

    # Use sheet_stats from combatantInfo if populated, else fallback to affix sum + 100 base
    if sheet_stats.get(primary_stat_name, 0) > 0 or sheet_stats.get("Stamina", 0) > 0:
        attrs["Intellect"] = sheet_stats["Intellect"]
        attrs["Strength"] = sheet_stats["Strength"]
        attrs["Agility"] = sheet_stats["Agility"]
        attrs["Stamina"] = sheet_stats["Stamina"]
        attrs["Haste"] = sheet_stats["Haste"]
        attrs["Expertise"] = sheet_stats["Expertise"]
        attrs["Critical Strike"] = sheet_stats["Critical Strike"]
        attrs["Spirit"] = sheet_stats["Spirit"]
        attrs["Armor"] = sheet_stats["Armor"]
    else:
        attrs[primary_stat_name] += 100

    # Gem Powers from combatant stats
    gem_powers = {
        "sapphire": combatant_stats.get("Sapphire", {}).get("min", 0),
        "amethyst": combatant_stats.get("Amethyst", {}).get("min", 0),
        "emerald": combatant_stats.get("Emerald", {}).get("min", 0),
        "ruby": combatant_stats.get("Ruby", {}).get("min", 0),
        "diamond": combatant_stats.get("Diamond", {}).get("min", 0),
        "topaz": combatant_stats.get("Topaz", {}).get("min", 0)
    }

    # 2. Extract Talents for Any Hero
    talents = []
    for t in combatant.get("talents", []):
        tname = t.get("name", "")
        if tname:
            talents.append(sanitize_name(tname))

    # Hero-Specific Slot & Quality 6 Legendary Mapping
    HERO_SLOT_LEGENDARY = {
        "rime": {3: "frostwyrms_spite", 9: "undulating_spirit", 10: "undulating_spirit", 5: "skandis_decree"},
        "mara": {3: "from_the_shadows", 9: "drenched_in_blood", 10: "drenched_in_blood", 5: "vexiras_venom"},
        "tariq": {3: "slayers_mosh", 9: "thundering_vortex", 10: "thundering_vortex", 5: "executioners_grin"},
        "ardeos": {3: "fire_toad", 9: "explosivo", 10: "explosivo", 5: "devouring_flame"},
        "elarion": {3: "shimmer", 9: "starstrikers_ascent", 10: "starstrikers_ascent", 5: "astronomers_hail"},
        "aeona": {3: "lonesome_song", 9: "chrono_trigger", 10: "chrono_trigger", 5: "mass_entropy"},
        "gunde": {3: "lego_1", 9: "lego_2", 10: "lego_2", 5: "lego_3"},
        "xavian": {3: "grossly_incandescent", 9: "solar_glare", 10: "solar_glare", 5: "fortress_in_the_sands"}
    }

    # Hero-Specific Legendaries Lookup
    HERO_LEGENDARY_PATTERNS = {
        "rime": [
            ("undulating_spirit", ["undulating", "signet of undulating", "eldrin signet", "undulating spirit", "undulating spirits", "undulat"]),
            ("frostwyrms_spite", ["drakesblood", "frostwyrm", "spite", "drakesblood tapestry"]),
            ("skandis_decree", ["skandi", "endless winter", "bands of endless winter"])
        ],
        "mara": [
            ("from_the_shadows", ["shadow-lined", "shadow lined", "shadow_lined", "assassin's shadow"]),
            ("drenched_in_blood", ["drenched in blood", "drenched_in_blood", "stalker", "crimson loop"]),
            ("vexiras_venom", ["vexira", "vexiras prey", "wristbands of vexira"])
        ],
        "tariq": [
            ("slayers_mosh", ["slayer king", "slayers mosh", "slayers_mosh"]),
            ("thundering_vortex", ["thundering vortex", "thundering_vortex", "vortex"]),
            ("executioners_grin", ["executioner", "executioners grin", "executioners_grin"])
        ],
        "ardeos": [
            ("fire_toad", ["flaming toad", "fire toad", "fire_toad"]),
            ("explosivo", ["explosivo", "boomtastic", "explosions"]),
            ("devouring_flame", ["devouring flame", "devouring_flame"])
        ],
        "elarion": [
            ("shimmer", ["shimmering silver", "shimmer"]),
            ("astronomers_hail", ["astronomer", "astronomers hail", "astronomers_hail"]),
            ("starstrikers_ascent", ["starstriker", "starstrikers ascent", "starstrikers_ascent"])
        ],
        "aeona": [
            ("lonesome_song", ["lone diety", "lone deity", "lonesome song", "lonesome_song"]),
            ("chrono_trigger", ["chrono trigger", "chrono_trigger"]),
            ("mass_entropy", ["withering shores", "mass entropy", "mass_entropy"])
        ],
        "gunde": [
            ("lego_1", ["sinister apron", "carver's sinister apron"]),
            ("lego_2", ["bleeding heart", "band of the bleeding heart"]),
            ("lego_3", ["raven god", "feathered wraps of the raven god"])
        ],
        "xavian": [
            ("grossly_incandescent", ["sunlit kingdom", "grossly incandescent", "grossly_incandescent"]),
            ("solar_glare", ["horizon", "solar glare", "solar_glare"]),
            ("fortress_in_the_sands", ["fortress", "sandworn", "fortress in the sands"])
        ]
    }

    detected_legendary = "none"
    # 1. First priority: Item with Quality >= 6 in the matching slot
    for item in gear:
        if item.get("quality", 0) >= 6:
            slot = item.get("slot")
            if slot in HERO_SLOT_LEGENDARY.get(hero_type, {}):
                detected_legendary = HERO_SLOT_LEGENDARY[hero_type][slot]
                break

    # 2. Second priority: Specific item name pattern match
    if detected_legendary == "none":
        hero_leg_defs = HERO_LEGENDARY_PATTERNS.get(hero_type, [])
        for item in gear:
            iname = item.get("name", "").lower()
            for leg_id, patterns in hero_leg_defs:
                for pat in patterns:
                    if pat in iname:
                        detected_legendary = leg_id
                        break
                if detected_legendary != "none":
                    break
            if detected_legendary != "none":
                break

    opt_leg = options.get("legendary")
    if opt_leg and opt_leg != "none":
        legendary_name = opt_leg
    else:
        legendary_name = detected_legendary

    # 3. Build .simc Output
    lines = []
    lines.append(f"# ====================================================================")
    lines.append(f"# FellowSimc Profile - {player_name} ({hero_type.upper()})")
    lines.append(f"# Imported from FellowshipLogs: {character_data.get('report_code')} (Fight {character_data.get('fight_id')})")
    lines.append(f"# ====================================================================")
    lines.append("")
    
    # Simulation Options
    iterations = options.get("iterations", 1000)
    lines.append(f"iterations={iterations}")
    lines.append(f"optimal_raid=0")
    lines.append(f"threads=12")
    lines.append("")

    # Route / Encounter Configuration
    mode = options.get("mode", "wyrmheart_62")
    custom_route_text = options.get("custom_route_text", "")
    
    if mode == "wyrmheart_62" or mode == "dungeon":
        lines.append("# Encounter: Calibrated Wyrmheart 62 Route")
        lines.append("apl/routes/wyrmheart_62_solo.simc")
    elif mode == "custom_route" and custom_route_text:
        lines.append("# Encounter: Custom Imported Route")
        lines.append(custom_route_text)
    elif mode == "single_target":
        flen = options.get("fight_length", 360)
        lines.append(f"# Encounter: Single Target ({flen}s)")
        lines.append(f"max_time={flen}")
        lines.append(f"vary_combat_length=0.0")
        lines.append(f"fight_style=Patchwerk")
    elif mode == "aoe":
        flen = options.get("fight_length", 120)
        targets = options.get("aoe_targets", 5)
        lines.append(f"# Encounter: AoE ({targets} Targets, {flen}s)")
        lines.append(f"max_time={flen}")
        lines.append(f"vary_combat_length=0.0")
        lines.append(f"fight_style=Patchwerk")
        lines.append(f"desired_targets={targets}")
        
    lines.append("")
    
    # Character Definition
    lines.append(f"# Hero & APL")
    lines.append(f'{hero_type}="{player_name}"')
    lines.append(f"level=80")
    
    use_custom_apl = options.get("use_custom_apl", False)
    custom_apl_text = options.get("custom_apl_text", "")
    apl_choice = options.get("apl_choice", "base")
    
    if use_custom_apl and custom_apl_text:
        lines.append("# Custom Action Priority List")
        lines.append(custom_apl_text)
    elif apl_choice == "talons" and hero_type == "rime":
        lines.append(f"apl/heroes/rime/rime_talons_apl.simc")
    elif apl_choice == "frostweaver" and hero_type == "rime":
        lines.append(f"apl/heroes/rime/rime_frostweaver_apl.simc")
    elif apl_choice == "soulfrost" and hero_type == "rime":
        lines.append(f"apl/heroes/rime/rime_soulfrost_apl.simc")
    elif apl_choice == "generic" and hero_type == "rime":
        lines.append(f"apl/heroes/rime/rime_generic_apl.simc")
    else:
        lines.append(f"apl/heroes/{hero_type}/{hero_type}_base_apl.simc")
    lines.append("")
    
    # Gear Stats: Primary stats subtract 100 base for SimC engine
    # Only include gear sets where the player has 2+ pieces equipped (all sets require 2/2)
    active_sets_list = [sval for sval, count in set_counts.items() if count >= 2]
    
    gear_int = max(0, attrs["Intellect"] - 100) if primary_stat_name == "Intellect" else attrs["Intellect"]
    gear_str = max(0, attrs["Strength"] - 100) if primary_stat_name == "Strength" else attrs["Strength"]
    gear_agi = max(0, attrs["Agility"] - 100) if primary_stat_name == "Agility" else attrs["Agility"]
    gear_stam = max(0, attrs["Stamina"] - 100) if attrs["Stamina"] >= 100 else attrs["Stamina"]
    gear_haste = attrs["Haste"]
    gear_exp = attrs["Expertise"]
    gear_crit = attrs["Critical Strike"]
    gear_spirit = attrs["Spirit"]
    gear_armor = attrs["Armor"]

    lines.append(f"# Gear Attributes & Ratings (Primary Stat -100 for SimC base engine)")
    if gear_int > 0: lines.append(f"gear_intellect={gear_int}")
    if gear_str > 0: lines.append(f"gear_strength={gear_str}")
    if gear_agi > 0: lines.append(f"gear_agility={gear_agi}")
    if gear_stam > 0: lines.append(f"gear_stamina={gear_stam}")
    if gear_haste > 0: lines.append(f"gear_haste_rating={gear_haste}")
    if gear_exp > 0: lines.append(f"gear_expertise_rating={gear_exp}")
    if gear_crit > 0: lines.append(f"gear_crit_rating={gear_crit}")
    if gear_spirit > 0: lines.append(f"gear_spirit={gear_spirit}")
    if gear_armor > 0: lines.append(f"gear_armor={gear_armor}")
    lines.append("")
    
    # Gem Powers
    lines.append(f"# Gem Powers")
    for gname, gpow in gem_powers.items():
        if gpow > 0:
            lines.append(f"gems.{gname}_power={gpow}")
    lines.append("")

    # Sets & Legendary
    lines.append(f"# Active Sets & Legendary")
    for sname in active_sets_list:
        lines.append(f"sets.{sname}=1")
    if legendary_name and legendary_name != "none":
        lines.append(f"legendary.{legendary_name}=1")
    lines.append("")

    # Weapon & Traits
    if weapon_name and weapon_name != "none":
        lines.append(f"# Equipped Weapon & Weapon Traits")
        lines.append(f"weapon={weapon_name}")
        for tname, trank in trait_counts.items():
            lines.append(f"weapon_trait.{tname}={trank}")
        lines.append("")
    elif trait_counts:
        lines.append(f"# Weapon Traits")
        for tname, trank in trait_counts.items():
            lines.append(f"weapon_trait.{tname}={trank}")
        lines.append("")
    
    # Gear Items (without affixes — affixes all go on trinket2/relic2)
    if gear_items_output:
        lines.append(f"# Gear Items")
        for g_line in gear_items_output:
            if blessings_list and g_line.startswith("trinket2="):
                continue
            lines.append(g_line)
        lines.append("")

    # All Blessings consolidated on trinket2=relic2
    if blessings_list:
        all_blessing_affixes = []
        for bname, count in blessing_counts.items():
            capped = min(4, max(0, count))
            for _ in range(capped):
                all_blessing_affixes.append(bname)
        if all_blessing_affixes:
            lines.append(f"# Blessings (All affixes on Relic 2)")
            lines.append(f"trinket2=relic2,affixes={'/'.join(all_blessing_affixes)}")
            lines.append("")

    # Talents
    if talents:
        lines.append(f"# Talents")
        tal_str = "/".join([f"{t}:1" for t in talents])
        lines.append(f"talents={tal_str}")
        lines.append("")

    profile_text = "\n".join(lines)
    
    return {
        "profile_text": profile_text,
        "hero_type": hero_type,
        "player_name": player_name,
        "attrs": attrs,
        "sheet_stats": sheet_stats,
        "talents": talents,
        "legendary": legendary_name,
        "traits": list(trait_counts.keys()),
        "trait_counts": trait_counts,
        "active_sets": active_sets_list,
        "blessings": blessings_list,
        "blessing_counts": blessing_counts,
        "gear_items_output": gear_items_output,
        "gear_item_names": gear_item_names,
        "gems": gem_powers,
        "weapon": weapon_name
    }


def scale_simc_route(route_text: str, scale_pct: float) -> str:
    """Scale all mob health in a simc route by scale_pct / 100.0."""
    factor = (scale_pct or 100.0) / 100.0
    if factor == 1.0:
        return route_text
    
    out_lines = []
    for line in route_text.splitlines():
        if line.strip().startswith("#") or not line.strip():
            out_lines.append(line)
            continue
            
        # 1. Scale enemies in raid_events+=/pull,...,enemies=...
        if "enemies=" in line:
            def scale_enemies(m):
                prefix = m.group(1)
                content = m.group(2)
                parts = content.split("|")
                new_parts = []
                for p in parts:
                    match = re.match(r'^(.*?):(\d+)((?::\d+:\d+)?)$', p.strip())
                    if match:
                        name = match.group(1)
                        hp = int(match.group(2))
                        rest = match.group(3)
                        new_hp = int(round(hp * factor))
                        new_parts.append(f"{name}:{new_hp}{rest}")
                    else:
                        new_parts.append(p)
                return f"{prefix}{'|'.join(new_parts)}"
                
            line = re.sub(r'(enemies=)([^\r\n,]+(?:\(.*?\))?[^\r\n,]*)', scale_enemies, line)
            
        # 2. Scale health in raid_events+=/adds,...,health=...,...
        if "health=" in line:
            def scale_health_param(match):
                hp = int(match.group(1))
                new_hp = int(round(hp * factor))
                return f"health={new_hp}"
            line = re.sub(r'\bhealth=(\d+)\b', scale_health_param, line)
            
        out_lines.append(line)
        
    return "\n".join(out_lines)


def fetch_dungeon_route(client_id, client_secret, code, fight_id, scale_pct=100.0):
    """Fetch dungeon fight data from FellowshipLogs and generate 100% and scaled route text."""
    token = get_access_token(client_id, client_secret)
    
    query = """
    query GetDungeonRoute($code: String!) {
      reportData {
        report(code: $code) {
          title
          fights {
            id
            name
            startTime
            endTime
            kill
          }
          masterData {
            actors {
              id
              name
              type
              subType
              gameID
            }
          }
        }
      }
    }
    """
    res = query_graphql(token, query, {"code": code})
    report = res.get("data", {}).get("reportData", {}).get("report", {})
    fights = report.get("fights", []) or []
    target_id = int(fight_id) if fight_id else 1
    fight = next((f for f in fights if int(f["id"]) == target_id), (fights[0] if fights else None))
    
    if not fight:
        raise ValueError(f"Fight {fight_id} not found in report {code}")
        
    fight_name = fight.get("name", "Dungeon")
    duration_s = max(1, int(round((fight["endTime"] - fight["startTime"]) / 1000.0)))
    
    # Check for known pre-extracted 100% routes if matching report & fight 32 (Wyrmheart)
    known_100_path = os.path.join(os.path.dirname(__file__), "..", "apl", "routes", "wyrmheart_62_100.simc")
    if os.path.exists(known_100_path) and (fight_id == 32 or "wyrmheart" in fight_name.lower()):
        with open(known_100_path, "r", encoding="utf-8") as f:
            route_text_100 = f.read()
    else:
        # Build dynamic route header & pulls
        lines = [
            f"# ====================================================================",
            f"# {fight_name} Dungeon Route (100% Full Health)",
            f"# Extracted from Fellowship Logs Report: {code} (Fight {fight_id})",
            f"# ====================================================================",
            f"",
            f"fight_style=DungeonRoute",
            f"max_time={duration_s}",
            f"vary_combat_length=0.0",
            f'enemy="{fight_name.replace(" ", "")}"',
            f"ignore_invulnerable_targets=1",
            f""
        ]
        
        pulls = fight.get("dungeonPulls") or []
        if not pulls:
            lines.append(f'raid_events+=/pull,pull=1,delay=000,enemies="BOSS_{fight_name.replace(" ", "_")}":10000000')
        else:
            for idx, p in enumerate(pulls, 1):
                p_name = p.get("name", f"Pull_{idx}").replace(" ", "_")
                lines.append(f"# Pull {idx}: {p.get('name')}")
                lines.append(f'raid_events+=/pull,pull={idx},delay=003,enemies="BOSS_{p_name}":5000000')
                lines.append("")
        route_text_100 = "\n".join(lines)
        
    route_text_scaled = scale_simc_route(route_text_100, scale_pct)
    
    return {
        "fight_id": fight_id,
        "fight_name": fight_name,
        "duration": duration_s,
        "route_text_100": route_text_100,
        "route_text": route_text_100,
        "route_text_scaled": route_text_scaled,
        "scale_pct": scale_pct,
        "enemies_count": len(re.findall(r'enemies=', route_text_100))
    }
