#pragma once

#include <array>
#include <cstdint>
#include <string_view>

namespace fellowship::rime::talents
{
  /// <summary>
  /// Strongly typed 64-bit bitmask identifiers for all Rime talents.
  /// </summary>
  enum class RimeTalentId : uint64_t
  {
    None = 0,
    Avalanche           = 1ULL << 0,
    CoalescingFrost     = 1ULL << 1,
    GlacialAssault      = 1ULL << 2,
    Burstbolter         = 1ULL << 3,
    ChillingFinesse     = 1ULL << 4,
    NavirsKeeper        = 1ULL << 5,
    CascadingBlitz      = 1ULL << 6,
    HarrowingIce        = 1ULL << 7,
    IcyFlow             = 1ULL << 8,
    BurstingSwallows    = 1ULL << 9,
    GreaterGlacialBlast = 1ULL << 10,
    ColdShower          = 1ULL << 11,
    IcyTalons           = 1ULL << 12,
    FrostweaversWrath   = 1ULL << 13,
    SoulfrostTorrent    = 1ULL << 14,
    BitingCold          = 1ULL << 15,
    SupremeTorrent      = 1ULL << 16,
    WisdomOfTheNorth    = 1ULL << 17
  };

  inline constexpr RimeTalentId operator|( RimeTalentId a, RimeTalentId b )
  {
    return static_cast<RimeTalentId>( static_cast<uint64_t>( a ) | static_cast<uint64_t>( b ) );
  }

  inline constexpr RimeTalentId operator&( RimeTalentId a, RimeTalentId b )
  {
    return static_cast<RimeTalentId>( static_cast<uint64_t>( a ) & static_cast<uint64_t>( b ) );
  }

  inline constexpr bool HasFlag( RimeTalentId mask, RimeTalentId flag )
  {
    return ( static_cast<uint64_t>( mask ) & static_cast<uint64_t>( flag ) ) != 0;
  }

  /// <summary>
  /// Metadata linking typed talent IDs to SimC string tokens and display names.
  /// </summary>
  struct TalentMetadata
  {
    RimeTalentId Id;
    std::string_view Identifier;
    std::string_view DisplayName;
  };

  inline constexpr std::array<TalentMetadata, 18> TalentRegistry = {{
    { RimeTalentId::Avalanche,           "avalanche",              "Avalanche" },
    { RimeTalentId::CoalescingFrost,     "coalescing_frost",       "Coalescing Frost" },
    { RimeTalentId::GlacialAssault,      "glacial_assault",        "Glacial Assault" },
    { RimeTalentId::Burstbolter,         "burstbolter",            "Burstbolter" },
    { RimeTalentId::ChillingFinesse,     "chilling_finesse",       "Chilling Finesse" },
    { RimeTalentId::NavirsKeeper,        "navirs_keeper",          "Navir's Keeper" },
    { RimeTalentId::CascadingBlitz,      "cascading_blitz",        "Cascading Blitz" },
    { RimeTalentId::HarrowingIce,        "harrowing_ice",          "Harrowing Ice" },
    { RimeTalentId::IcyFlow,             "icy_flow",               "Icy Flow" },
    { RimeTalentId::BurstingSwallows,    "bursting_swallows",      "Bursting Swallows" },
    { RimeTalentId::GreaterGlacialBlast, "greater_glacial_blast",  "Greater Glacial Blast" },
    { RimeTalentId::ColdShower,          "cold_shower",            "Cold Shower" },
    { RimeTalentId::IcyTalons,           "icy_talons",             "Icy Talons" },
    { RimeTalentId::FrostweaversWrath,   "frostweavers_wrath",     "Frostweaver's Wrath" },
    { RimeTalentId::SoulfrostTorrent,    "soulfrost_torrent",      "Soulfrost Torrent" },
    { RimeTalentId::BitingCold,          "biting_cold",            "Biting Cold" },
    { RimeTalentId::SupremeTorrent,      "supreme_torrent",        "Supreme Torrent" },
    { RimeTalentId::WisdomOfTheNorth,    "wisdom_of_the_north",    "Wisdom of the North" }
  }};
}

