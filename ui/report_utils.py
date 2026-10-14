"""
ui/report_utils.py
Centralized hero registry and utility module for FellowSimc reporting,
metrics aggregation, string resolution, and styling.
"""

import os
import re
from collections import defaultdict

UI_DIR = os.path.abspath(os.path.dirname(__file__))
CSS_DIR = os.path.join(UI_DIR, "static", "css")

# ==============================================================================
# HERO DEFINITIONS: Actions, Buffs, and Damage Schools
# ==============================================================================

RIME_ACTIONS = {
    "frost_bolt": {"display": "Frost Bolt", "school": "Frost", "category": "Builder"},
    "cold_snap": {"display": "Cold Snap", "school": "Frost", "category": "Builder / Spender"},
    "freezing_torrent": {"display": "Freezing Torrent", "school": "Frost", "category": "Channel"},
    "talon_strike": {"display": "Talon Strike", "school": "Physical", "category": "Direct Strike"},
    "rising_talons": {"display": "Rising Talons", "school": "Physical", "category": "Talent Strike"},
    "bursting_ice": {"display": "Bursting Ice", "school": "Frost", "category": "AoE Burst"},
    "glacial_assault": {"display": "Glacial Assault", "school": "Frost", "category": "Cleave Passive"},
    "glacial_blast": {"display": "Glacial Blast", "school": "Frost", "category": "Direct Strike"},
    "frost_swallows": {"display": "Frost Swallows", "school": "Frost", "category": "Proc Swallows"},
    "ice_blitz": {"display": "Ice Blitz", "school": "Frost", "category": "Major Cooldown"},
    "ice_comet": {"display": "Ice Comet", "school": "Frost", "category": "Capstone Burst"},
}

RIME_BUFFS = [
    ("Flight of the Navir", "flight_of_the_navir", "Talent Capstone Aura"),
    ("Freezing Torrent", "freezing_torrent_channel", "Channel Ability Duration"),
    ("Ice Blitz", "ice_blitz", "Class Major Cooldown"),
    ("Winter's Embrace", "winters_embrace", "Bursting Ice Synergy (+20%)"),
    ("Wrath of Winter", "wrath_of_winter", "Class Damage Buff (+20%)"),
    ("Winter's Blessing", "winters_blessing", "Class Aura"),
    ("Navir's Keeper", "navirs_keeper", "Talent Free Snap Proc"),
]

ELARION_ACTIONS = {
    "shoot": {"display": "Shoot", "school": "Physical", "category": "Basic Attack"},
    "focused_shot": {"display": "Focused Shot", "school": "Physical", "category": "Direct Shot"},
    "celestial_shot": {"display": "Celestial Shot", "school": "Physical", "category": "Builder Shot"},
    "multishot": {"display": "Multishot", "school": "Physical", "category": "Cleave Volley"},
    "highwind_arrow": {"display": "Highwind Arrow", "school": "Physical", "category": "Piercing Arrow"},
    "heartseeker_barrage": {"display": "Heartseeker Barrage", "school": "Physical", "category": "Channel Barrage"},
    "starfall_volley": {"display": "Starfall Volley", "school": "Physical", "category": "AoE Rain"},
    "lunarlight_salvo": {"display": "Lunarlight Salvo", "school": "Arcane", "category": "Direct Salvo"},
    "lunarlight_salvo_aoe": {"display": "Lunarlight Salvo: Erupt", "school": "Arcane", "category": "Secondary AoE Erupt"},
    "lunarlight_mark": {"display": "Lunarlight Mark", "school": "Arcane", "category": "Mark Ability"},
    "skystriders_supremacy": {"display": "Skystrider's Supremacy", "school": "Physical", "category": "Capstone"},
    "skystriders_grace": {"display": "Skystrider's Grace", "school": "Physical", "category": "Major Cooldown"},
    "event_horizon": {"display": "Event Horizon", "school": "Arcane", "category": "Ultimate"},
}

ELARION_BUFFS = [
    ("Rising Spirit", "rising_spirit", "Talent / Passive Buff"),
    ("Skystrider's Grace", "skystriders_grace", "Talent Cooldown Buff"),
    ("Lunarlight Mark", "lunarlight_mark", "Target Mark Debuff"),
    ("Event Horizon", "event_horizon", "Ultimate Amp Aura"),
]

MARA_ACTIONS = {
    "backstab": {"display": "Backstab", "school": "Physical", "category": "Builder Strike"},
    "queens_fang": {"display": "Queen's Fang", "school": "Physical", "category": "Direct Strike"},
    "widows_bite": {"display": "Widow's Bite", "school": "Physical", "category": "Bleed Finisher"},
    "brooding_shadows": {"display": "Brooding Shadows", "school": "Shadow", "category": "Passive Bleed"},
    "from_the_shadows": {"display": "From the Shadows", "school": "Shadow", "category": "Stealth Strike"},
    "shadowstep": {"display": "Shadowstep", "school": "Shadow", "category": "Utility"},
    "fan_of_knives": {"display": "Fan of Knives", "school": "Physical", "category": "AoE Strike"},
}

MARA_BUFFS = [
    ("Brooding Shadows", "brooding_shadows", "Shadow Amp Buff"),
    ("From the Shadows", "from_the_shadows", "Stealth Damage Buff"),
]

TARIQ_ACTIONS = {
    "wild_swing": {"display": "Wild Swing", "school": "Physical", "category": "Builder Strike"},
    "face_breaker": {"display": "Face Breaker", "school": "Physical", "category": "Stun Strike"},
    "heavy_strike": {"display": "Heavy Strike", "school": "Physical", "category": "Heavy Strike"},
    "skull_crusher": {"display": "Skull Crusher", "school": "Physical", "category": "Overhead Crush"},
    "rampage": {"display": "Rampage", "school": "Physical", "category": "Fury Finisher"},
    "hammer_storm": {"display": "Hammer Storm", "school": "Physical", "category": "Spin AoE"},
    "culling_strike": {"display": "Culling Strike", "school": "Physical", "category": "Execute Strike"},
    "thunder_call": {"display": "Thunder Call", "school": "Lightning", "category": "Lightning Shroud"},
    "chain_lightning": {"display": "Chain Lightning", "school": "Lightning", "category": "Chain Zap"},
}

TARIQ_BUFFS = [
    ("Focused Wrath", "focused_wrath", "Class Enrage Buff"),
    ("Raging Tempest", "raging_tempest", "Lightning Aura"),
]

ARDEOS_ACTIONS = {
    "infernal_wave": {"display": "Infernal Wave", "school": "Fire", "category": "Wave Blast"},
    "detonate": {"display": "Detonate", "school": "Fire", "category": "Explosion"},
    "wildfire": {"display": "Wildfire", "school": "Fire", "category": "Spreading DoT"},
    "incinerate": {"display": "Incinerate", "school": "Fire", "category": "Heavy Cast"},
    "combustion": {"display": "Combustion", "school": "Fire", "category": "Major Cooldown"},
    "fireball": {"display": "Fireball", "school": "Fire", "category": "Basic Builder"},
    "fire_toad": {"display": "Fire Toad", "school": "Fire", "category": "Summon Burst"},
}

ARDEOS_BUFFS = [
    ("Combustion", "combustion", "Class Critical Aura"),
    ("Wildfire", "wildfire", "Fire DoT Effect"),
]

GUNDE_ACTIONS = {
    "double_strike": {"display": "Double Strike", "school": "Physical", "category": "Twin Strike"},
    "grim_carve": {"display": "Grim Carve", "school": "Physical", "category": "Heavy Slash"},
    "reavers_edge": {"display": "Reaver's Edge", "school": "Physical", "category": "Bleed Carve"},
    "blood_arc": {"display": "Blood Arc", "school": "Physical", "category": "Whirl Cleave"},
    "heart_splitter": {"display": "Heart Splitter", "school": "Physical", "category": "Legendary Finisher"},
    "slaughter": {"display": "Slaughter", "school": "Physical", "category": "Execute"},
    "rend": {"display": "Rend", "school": "Physical", "category": "Bleed DoT"},
    "rupture": {"display": "Rupture", "school": "Physical", "category": "Deep Bleed"},
}

GUNDE_BUFFS = [
    ("Blood Frenzy", "blood_frenzy", "Haste Buff"),
    ("Berserker's Rage", "berserkers_rage", "Damage Buff"),
]

XAVIAN_ACTIONS = {
    "sun_strike": {"display": "Sun Strike", "school": "Holy", "category": "Solar Slash"},
    "blinding_slash": {"display": "Blinding Slash", "school": "Holy", "category": "Flash Attack"},
    "omnistrike": {"display": "Omnistrike", "school": "Holy", "category": "Combo Finisher"},
    "solar_blades": {"display": "Solar Blades", "school": "Holy", "category": "Whirling Blades"},
    "radiance": {"display": "Radiance", "school": "Holy", "category": "Holy Burst"},
    "suns_verdict": {"display": "Sun's Verdict", "school": "Holy", "category": "Judgement Strike"},
}

XAVIAN_BUFFS = [
    ("Solaris", "solaris", "Class Solar Aura"),
    ("Decree of the Sun", "decree_of_the_sun", "Radiant Damage Buff"),
]

AEONA_ACTIONS = {
    "time_shard": {"display": "Time Shard", "school": "Arcane", "category": "Shard Strike"},
    "echoes_of_ruin": {"display": "Echoes of Ruin", "school": "Arcane", "category": "Echo Blast"},
    "entropys_claim": {"display": "Entropy's Claim", "school": "Shadow", "category": "Entropy DoT"},
    "unfolding_doom": {"display": "Unfolding Doom", "school": "Shadow", "category": "Cataclysm Burst"},
}

AEONA_BUFFS = [
    ("Temporal Distortion", "temporal_distortion", "Speed Buff"),
    ("Entropic Collapse", "entropic_collapse", "DoT Amp"),
]

# Universal Relics, Weapon Traits, Gems, and Blessings
SHARED_ACTIONS = {
    "chronoshift": {"display": "Chronoshift", "school": "Universal", "category": "Weapon Relic Active"},
    "amethyst_splinters": {"display": "Amethyst Splinters", "school": "Shadow", "category": "Weapon Trait Proc"},
    "emerald_judgement": {"display": "Emerald Judgement", "school": "Nature", "category": "Weapon Trait Proc"},
    "voidbringer": {"display": "Voidbringer's Touch", "school": "Shadow", "category": "Weapon Trait Proc"},
    "natures_fury": {"display": "Nature's Fury", "school": "Nature", "category": "Trinket Proc"},
    "icicles_of_anzhyr": {"display": "Icicles of Anzhyr", "school": "Frost", "category": "Weapon Trait Proc"},
    "fated_strike": {"display": "Fated Strike", "school": "Physical", "category": "Weapon Trait Proc"},
    "sahrils_wrath": {"display": "Sahril's Wrath", "school": "Fire", "category": "Weapon Trait Proc"},
    "earthbreaker": {"display": "Earthbreaker", "school": "Physical", "category": "Weapon Trait Proc"},
    "ancestral_surge": {"display": "Ancestral Surge", "school": "Universal", "category": "Gem Set Proc"},
    "spirit_flame": {"display": "Spirit Flame", "school": "Fire", "category": "Relic Trait"},
    "unstable_currents": {"display": "Unstable Currents", "school": "Lightning", "category": "Relic Trait"},
}

SHARED_BUFFS = [
    ("Seized Opportunity", "seized_opportunity", "Relic Weapon Trait"),
    ("First Strike - II", "first_strike", "Gem Set Passive"),
    ("Ancestral Surge - II", "ancestral_surge", "Gem Set Passive"),
    ("Drakheim's Absolution", "drakheims_absolution", "Armor 4-Piece Set (+20%)"),
    ("Undulating Spirit", "undulating_spirit", "Legendary Effect"),
    ("Asha's Arcane Embrace (Asha's Chronoshift Spire)", "chronoshift_barrier", "Weapon Channel Shield"),
    ("Martial Initiative", "martial_initiative", "Weapon Trait (Rank 2)"),
    ("Draconic Might", "draconic_might", "Gear Set Buff"),
    ("Kindling", "kindling", "Weapon Trait (Rank 3)"),
    ("The Trickster", "the_trickster", "Blessing (Crit)"),
    ("The Intrepid", "the_intrepid", "Blessing (Haste)"),
    ("The Sage", "the_sage", "Blessing (Spirit)"),
    ("The Subduer", "the_subduer", "Blessing (Boss Amp)"),
]

HERO_MODULES = {
    "Rime": {"actions": RIME_ACTIONS, "buffs": RIME_BUFFS},
    "Elarion": {"actions": ELARION_ACTIONS, "buffs": ELARION_BUFFS},
    "Mara": {"actions": MARA_ACTIONS, "buffs": MARA_BUFFS},
    "Tariq": {"actions": TARIQ_ACTIONS, "buffs": TARIQ_BUFFS},
    "Ardeos": {"actions": ARDEOS_ACTIONS, "buffs": ARDEOS_BUFFS},
    "Gunde": {"actions": GUNDE_ACTIONS, "buffs": GUNDE_BUFFS},
    "Xavian": {"actions": XAVIAN_ACTIONS, "buffs": XAVIAN_BUFFS},
    "Aeona": {"actions": AEONA_ACTIONS, "buffs": AEONA_BUFFS},
}

# Derived Physical Abilities Set across all heroes
PHYSICAL_ABILITIES = {
    info["display"]
    for hero in HERO_MODULES.values()
    for info in hero["actions"].values()
    if info["school"] == "Physical"
} | {
    info["display"]
    for info in SHARED_ACTIONS.values()
    if info["school"] == "Physical"
}

# Backward compatibility alias
BUFF_REGISTRY = RIME_BUFFS + SHARED_BUFFS

def get_hero_buffs(hero_name=None):
    """Returns hero-specific buffs + universal buffs."""
    if not hero_name:
        return BUFF_REGISTRY
    normalized = hero_name.strip().title()
    if normalized in HERO_MODULES:
        return HERO_MODULES[normalized]["buffs"] + SHARED_BUFFS
    return BUFF_REGISTRY

def get_hero_actions(hero_name=None):
    """Returns hero-specific actions merged with universal shared actions."""
    res = dict(SHARED_ACTIONS)
    if hero_name:
        normalized = hero_name.strip().title()
        if normalized in HERO_MODULES:
            res.update(HERO_MODULES[normalized]["actions"])
    return res

def is_physical_ability(ability_name, hero_name=None):
    """Checks whether an ability belongs to the Physical damage school."""
    if ability_name in PHYSICAL_ABILITIES:
        return True
    actions = get_hero_actions(hero_name)
    for act_key, info in actions.items():
        if info["display"].lower() == ability_name.lower():
            return info.get("school") == "Physical"
    return False

def slugify_ability_name(name, hero_name=None):
    """
    Converts an in-game or combat log ability name into its exact SimC action token.
    Respects hero-specific mappings (e.g. Shoot -> shoot for Elarion).
    """
    if not name:
        return ""
    raw = name.strip()
    lowered = raw.lower()

    # 1. Match against known hero / shared actions
    actions = get_hero_actions(hero_name)
    for act_key, info in actions.items():
        if info["display"].lower() == lowered:
            return act_key

    # 2. Match across all heroes
    for hero, mod in HERO_MODULES.items():
        for act_key, info in mod["actions"].items():
            if info["display"].lower() == lowered:
                return act_key

    # 3. Specific non-token aliases
    if lowered in ("lunarlight salvo: erupt", "lunarlight salvo aoe"):
        return "lunarlight_salvo_aoe"
    if "voidbringer" in lowered:
        return "voidbringer"

    # 4. Canonical slugification
    normalized = re.sub(r'[^a-z0-9\s_]', '', lowered)
    return re.sub(r'[\s]+', '_', normalized)

def load_css(filename):
    """Loads a CSS file from ui/static/css/ for inlining into standalone HTML reports."""
    path = os.path.join(CSS_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Warning: failed to read {path}: {e}")
    return ""

def clean_title(s):
    """Converts a snake_case or kebab-case identifier into a clean Title Case string."""
    if not s:
        return ""
    cleaned = re.sub(r'[_\-]+', ' ', s).strip()
    words = [w.capitalize() if not w.isupper() else w for w in cleaned.split()]
    return ' '.join(words)

def format_number(val, decimals=0):
    if val is None:
        return "0"
    try:
        f = float(val)
        if decimals == 0:
            return f"{round(f):,}"
        return f"{f:,.{decimals}f}"
    except (ValueError, TypeError):
        return str(val)

def format_casts(casts):
    if casts and casts > 0:
        return f"{int(round(casts)):,}"
    return "-"

def format_hits(hits):
    if hits and hits > 0:
        return f"{int(round(hits)):,}"
    return "-"

def format_crit(crit_pct, hits):
    if hits and hits > 0:
        return f"{crit_pct:.1f}%"
    return "-"

def format_fl_amount(val):
    if val >= 1_000_000:
        return f"{val / 1_000_000:.2f}m"
    elif val >= 1_000:
        return f"{val / 1_000:.1f}k"
    elif val > 0:
        return f"{val:.0f}"
    return "-"

def format_fl_avg(val):
    if val >= 1_000_000:
        return f"{val / 1_000_000:.1f}m"
    elif val >= 1_000:
        return f"{val / 1_000:.1f}k"
    elif val > 0:
        return f"{val:.1f}"
    return "-"

def aggregate_simc_stats(player_obj, real_stats=None, hero_name=None):
    """
    Recursively aggregates SimC action stats from a player JSON object.
    Uses the native 'display_name' emitted by the C++ engine whenever available,
    falling back to registered hero actions.
    """
    sim_stats = defaultdict(lambda: {"casts": 0.0, "hits": 0.0, "crits": 0.0, "dmg": 0.0, "raw_name": ""})
    real_stats = real_stats or {}
    hero_actions = get_hero_actions(hero_name)

    def resolve_display_name(raw_name, disp_name):
        if disp_name and disp_name.strip() and disp_name.strip() != raw_name:
            return disp_name.strip()
        # Check hero actions
        if raw_name in hero_actions:
            return hero_actions[raw_name]["display"]
        # Check real_stats
        clean_raw = re.sub(r'[^a-z0-9]', '', raw_name.lower())
        for r_name in real_stats:
            clean_r = re.sub(r'[^a-z0-9]', '', r_name.lower())
            if clean_raw == clean_r:
                return r_name
        return clean_title(raw_name)

    def walk_stat(obj, parent_name=""):
        name = obj.get("name", "")
        disp = obj.get("display_name", "")
        executes = float(obj.get("num_executes", {}).get("mean", 0.0)) if isinstance(obj.get("num_executes"), dict) else 0.0
        
        direct_h = float(obj.get("direct_results", {}).get("hit", {}).get("count", {}).get("mean", 0.0))
        tick_h = float(obj.get("tick_results", {}).get("hit", {}).get("count", {}).get("mean", 0.0))
        direct_c = float(obj.get("direct_results", {}).get("crit", {}).get("count", {}).get("mean", 0.0))
        tick_c = float(obj.get("tick_results", {}).get("crit", {}).get("count", {}).get("mean", 0.0))
        
        hits = direct_h + tick_h
        crits = direct_c + tick_c
        if hits == 0 and crits == 0:
            h = float(obj.get("num_direct_results", {}).get("mean", 0.0) or obj.get("num_ticks", {}).get("mean", 0.0))
            c = float(obj.get("direct_results", {}).get("crit", {}).get("count", {}).get("mean", 0.0))
            hits = max(0.0, h - c)
            crits = c
            
        dmg = float(obj.get("actual_amount", {}).get("mean", 0.0)) or float(obj.get("total_amount", {}).get("mean", 0.0))

        resolved_title = resolve_display_name(name, disp)
        if resolved_title:
            sim_stats[resolved_title]["casts"] += executes
            sim_stats[resolved_title]["hits"] += (hits + crits)
            sim_stats[resolved_title]["crits"] += crits
            sim_stats[resolved_title]["dmg"] += dmg
            if not sim_stats[resolved_title]["raw_name"]:
                sim_stats[resolved_title]["raw_name"] = name

        for child in obj.get("children", []):
            walk_stat(child, name)

    for act in player_obj.get("stats", []):
        walk_stat(act)

    return sim_stats
