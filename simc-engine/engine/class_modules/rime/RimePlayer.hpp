#pragma once

#include "class_modules/fs_player.hpp"
#include "class_modules/rime/RimeTargetData.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "class_modules/rime/talents/NavirsKeeper.hpp"
#include "class_modules/rime/talents/HarrowingIce.hpp"
#include "class_modules/rime/talents/IcyFlow.hpp"
#include "class_modules/rime/talents/GlacialAssault.hpp"
#include "class_modules/rime/talents/FrostweaversWrath.hpp"
#include "class_modules/rime/talents/SoulfrostTorrent.hpp"
#include "util/timespan.hpp"
#include "util/util.hpp"
#include "simulationcraft.hpp"

namespace fellowship::rime
{
  class RimePlayer;
  using rime_t = RimePlayer;

  enum class secondary_trigger
  {
    NONE = 0U,
    AVALANCHE,
    COLD_SHOWER
  };

  namespace actions
  {
    struct rime_heal_t;
    struct rime_spell_t;
    struct melee_t;
  }

  /// <summary>
  /// Typed wrapper around fs_player_buff_t providing direct access to the owning RimePlayer.
  /// </summary>
  struct RimeBuff : public fs_player_buff_t
  {
    RimeBuff( player_t* p, util::string_view name ) : fs_player_buff_t( p, name )
    {
    }

    RimePlayer* Player()
    {
      return debug_cast<RimePlayer*>( player );
    }

    const RimePlayer* Player() const
    {
      return debug_cast<const RimePlayer*>( player );
    }

    RimePlayer* p() { return Player(); }
    const RimePlayer* p() const { return Player(); }
  };

  using rime_buff_t = RimeBuff;

  /// <summary>
  /// Rime specialization player class.
  /// Manages class resources (Spirit, Anima, Winter Orbs), talents, buffs, cooldowns, and actions.
  /// </summary>
  class RimePlayer : public fellowship::fs_player_t
  {
  public:
    struct RimeActions
    {
      actions::rime_spell_t* ice_comet                     = nullptr;
      actions::rime_spell_t* flight_of_the_navir           = nullptr;
      actions::rime_spell_t* frost_swallow                 = nullptr;
      actions::rime_spell_t* cold_snap                     = nullptr;
      actions::rime_spell_t* freezing_torrent              = nullptr;
      actions::rime_spell_t* glacial_blast                 = nullptr;
      actions::rime_spell_t* frost_bolt                    = nullptr;
      actions::rime_spell_t* bursting_ice                  = nullptr;
      actions::rime_spell_t* bursting_ice_tick             = nullptr;
      actions::rime_spell_t* ice_blitz                     = nullptr;
      actions::rime_spell_t* wrath_of_winter               = nullptr;
      actions::rime_spell_t* winters_blessing              = nullptr;
      actions::rime_spell_t* coalescing_frost              = nullptr;
      actions::rime_spell_t* ice_comet_avalanche           = nullptr;
      actions::rime_spell_t* ice_comet_cold_shower         = nullptr;
      actions::rime_spell_t* rising_talon_hit              = nullptr;
      actions::rime_spell_t* talon_strike_hit              = nullptr;
      actions::rime_spell_t* glacial_assault               = nullptr;
    } actions;
    using actions_t = RimeActions;

    struct RimeBuffs
    {
      buff_t* ultimate_buff_window = nullptr;
      buff_t* glacial_assault      = nullptr;
      buff_t* flight_of_the_navir  = nullptr;
      buff_t* icy_flow             = nullptr;
      buff_t* icy_flow_haste       = nullptr;
      buff_t* ice_blitz            = nullptr;
      buff_t* winters_embrace      = nullptr;
      buff_t* winters_blessing     = nullptr;
      buff_t* soulfrost_torrent    = nullptr;
      buff_t* frostweavers_wrath   = nullptr;
      buff_t* frostwyrms_spite     = nullptr;
      buff_t* undulating_spirit    = nullptr;
      buff_t* navirs_keeper        = nullptr;
      buff_t* harrowing_ice        = nullptr;
    } buffs;
    using buffs_t = RimeBuffs;

    struct RimeCooldowns
    {
      cooldown_t* cold_snap           = nullptr;
      cooldown_t* freezing_torrent    = nullptr;
      cooldown_t* bursting_ice        = nullptr;
      cooldown_t* ice_blitz           = nullptr;
      cooldown_t* flight_of_the_navir = nullptr;
      cooldown_t* winters_blessing    = nullptr;
    } cooldowns;
    using cooldowns_t = RimeCooldowns;

    struct RimeGains
    {
      gain_t* spirit_procs       = nullptr;
      gain_t* anima_worbs        = nullptr;
      gain_t* ult_worbs          = nullptr;

      // Modern human-readable aliases
      gain_t* SpiritProcs        = nullptr;
      gain_t* AnimaWinterOrbs    = nullptr;
      gain_t* UltimateWinterOrbs = nullptr;
    } gains;
    using gains_t = RimeGains;

    struct RimeProcs
    {
      proc_t* coal_no_targets          = nullptr;
      proc_t* CoalescingFrostNoTargets = nullptr;
    } procs;
    using procs_t = RimeProcs;

    struct RimeRngObjects
    {
      real_ppm_t*        soulfrost_torrent  = nullptr;
      accumulated_rng_t* frostweavers_wrath = nullptr;
      accumulated_rng_t* bursting_swallows  = nullptr;
      accumulated_rng_t* cold_shower        = nullptr;
      accumulated_rng_t* avalanche_double   = nullptr;
      accumulated_rng_t* avalanche_triple   = nullptr;
    } rngs;
    using rng_objects_t = RimeRngObjects;

#define RIME_TALENT_LIST( X )                                                  \
    X( AVALANCHE, "avalanche", "Avalanche" )                                     \
    X( COALESCING_FROST, "coalescing_frost", "Coalescing Frost" )                \
    X( GLACIAL_ASSAULT, "glacial_assault", "Glacial Assault" )                   \
    X( BURSTBOLTER, "burstbolter", "Burstbolter" )                               \
    X( CHILLING_FINESSE, "chilling_finesse", "Chilling Finesse" )                \
    X( NAVIRS_KEEPER, "navirs_keeper", "Navir's Keeper" )                        \
    X( CASCADING_BLITZ, "cascading_blitz", "Cascading Blitz" )                   \
    X( HARROWING_ICE, "harrowing_ice", "Harrowing Ice" )                         \
    X( ICY_FLOW, "icy_flow", "Icy Flow" )                                        \
    X( BURSTING_SWALLOWS, "bursting_swallows", "Bursting Swallows" )             \
    X( GREATER_GLACIAL_BLAST, "greater_glacial_blast", "Greater Glacial Blast" ) \
    X( COLD_SHOWER, "cold_shower", "Cold Shower" )                               \
    X( ICY_TALONS, "icy_talons", "Icy Talons" )                                  \
    X( FROSTWEAVERS_WRATH, "frostweavers_wrath", "Frostweaver's Wrath" )         \
    X( SOULFROST_TORRENT, "soulfrost_torrent", "Soulfrost Torrent" )             \
    X( BITING_COLD, "biting_cold", "Biting Cold" )                               \
    X( SUPREME_TORRENT, "supreme_torrent", "Supreme Torrent" )                   \
    X( WISDOM_OF_THE_NORTH, "wisdom_of_the_north", "Wisdom of the North" )

    enum rime_talent_index_t
    {
#define X( name, id, pretty ) name##_INDEX,
      RIME_TALENT_LIST( X )
#undef X
      RIME_TALENT_MAX
    };

    enum rime_talents_t : unsigned long long
    {
      NONE = 0,
#define X( name, id, pretty ) name = 1ULL << name##_INDEX,
      RIME_TALENT_LIST( X )
#undef X
      MAX = 1ULL << RIME_TALENT_MAX
    };

    static constexpr talent_info RIME_TALENTS[] = {
#define X( name, id, pretty ) { rime_talents_t::name, id, pretty },
      RIME_TALENT_LIST( X )
#undef X
    };

    constexpr std::string_view talent_name( long long t ) override
    {
      for ( const auto& talent : RIME_TALENTS )
        if ( talent.flag == t )
          return talent.id;

      return "unknown_talent";
    }

    constexpr std::string_view talent_name_formatted( long long t ) override
    {
      for ( const auto& talent : RIME_TALENTS )
        if ( talent.flag == t )
          return talent.pretty;

      return "Unknown Talent";
    }

    bool HasTalent( talents::RimeTalentId id ) const
    {
      return talents_enabled( static_cast<unsigned>( id ) );
    }

    struct RimeTalents
    {
      timespan_t chilling_finesse_bursting_ice_cdr_per_tick = 0.2_s;
      timespan_t chilling_finesse_torrent_cdr_per_snap      = 1.5_s;

      double     harrowing_ice_mul_per_stack = 0.03;
      int        harrowing_ice_max_stacks       = 30;
      timespan_t harrowing_ice_duration  = 12_s;
      timespan_t harrowing_ice_cdr       = 5_s;

      int    glacial_assault_stacks      = 4;
      double glacial_assault_amp      = 0.4;
      double glacial_assault_cleave   = 0.3;
      int    glacial_assault_aoe_falloff = 12;

      int    burstbolter_bursting_ice_pulses = 1;
      double burstbolter_bursting_ice_amp = 0.2;

      timespan_t icy_flow_buff_duration = 15_s;
      double     icy_flow_cc                = 0.2;
      double     icy_flow_temp_haste        = 0.5;
      int        icy_flow_max_stacks           = 2;

      int navirs_keeper_cold_snaps = 2;

      int cascading_blitz_birds_per_anima = 1;

      double avalanche_double = 0.18;
      double avalanche_triple = 0.09;

      timespan_t coalescing_frost_duration      = 3_s;
      double     coalescing_frost_sp_mul            = 0.56;
      double     coalescing_frost_crit_extra_chance = 0.5;
      int        coalescing_frost_crit_stacks          = 2;
      int        coalescing_frost_max_stacks           = 30;
      double     coalescing_frost_falloff           = 5.0;

      double bursting_swallows_chance = 0.12;

      double     greater_glacial_blast_amp                 = 0.4;
      timespan_t greater_glacial_blast_added_cast_time = 0.5_s;

      double cold_shower_chance = 0.07;

      double icy_talons_st_multiplier  = 0.4;
      double icy_talons_aoe_multiplier = 0.4;

      double     frostweavers_wrath_chance_per_orb    = 0.2;
      timespan_t frostweavers_wrath_buff_duration = 12_s;
      double     frostweavers_wrath_added_cc          = 1.0;

      timespan_t soulfrost_torrent_buff_duration = 18_s;
      double     soulfrost_torrent_tickrate_increase = 1.4;
      double     soulfrost_torrent_crit_chance       = 1.0;
      double     soulfrost_torrent_rppm              = 1.2;

      double biting_cold_crit_power = 0.1;

      timespan_t supreme_torrent_duration = 0.8_s;
      double     supreme_torrent_dmg_amp      = 0.2;

      timespan_t wisdom_of_the_north_cdr = 0.3_s;
    } talents;
    using talents_t = RimeTalents;

    struct RimeSpellConstants
    {
      double     spirit_refund_mul = 2.0;

      double     frost_bolt_coeff    = 2.017;
      timespan_t frost_bolt_cast = 1.5_s;
      int        frost_bolt_anima_gen   = 3;

      timespan_t flight_of_navir_cd = 60_s;
      double     bird_coeff             = 0.469;
      double     bird_spirit_multiplier = 1.5;

      double     ice_comet_coeff   = 4.8045 * 1.1;
      double     ice_comet_falloff = 12;
      int        ice_comet_cost       = 2;

      double     glacial_blast_coeff    = 10.24;
      timespan_t glacial_blast_cast = 2_s;
      int        glacial_blast_cost        = 2;

      timespan_t winters_blessing_cd           = 60_s;
      double     winters_blessing_spirit           = 0.2;
      double     winters_blessing_heal_factor      = 0.3;
      timespan_t winters_embrace_heal_batching = 0.5_s;

      double     cold_snap_coeff  = 3.145;
      timespan_t cold_snap_cd = 12_s;
      int        cold_snap_charges   = 2;

      double     freezing_torrent_tick_coeff   = 1.4806;
      timespan_t freezing_torrent_duration = 2_s;
      timespan_t freezing_torrent_period   = 0.4_s;
      timespan_t freezing_torrent_cooldown = 15_s;

      double     bursting_ice_coeff        = 0.498;
      timespan_t bursting_ice_duration = 3_s;
      timespan_t bursting_ice_period   = 0.5_s;
      int        bursting_ice_falloff         = 5;
      timespan_t bursting_ice_cooldown = 10_s;
      timespan_t bursting_ice_cast     = 2_s;
      int        bursting_ice_anima_gen       = 1;
      double     bursting_ice_amp          = 0.2;

      timespan_t ice_blitz_cd                 = 60_s;
      double     ice_blitz_mul                    = 0.2;
      timespan_t ice_blitz_extension_per_bird = 0.1_s;

      timespan_t dash_cd = 25_s;
      int        dash_charges   = 2;
    } spell_const;

    struct RimeLegendaries
    {
      bool       frostwyrms_spite                 = false;
      double     frostwyrms_spite_dmg_per_stack = 0.3;
      int        frostwyrms_spite_max_stacks       = 30;
      timespan_t frostwyrms_spite_duration  = 15_s;

      bool       skandis_decree                      = false;
      timespan_t skandis_decree_duration_bonus = 2_s;

      bool   undulating_spirit                         = false;
      double undulating_spirit_additional_spirit     = 50.0;
      double undulating_spirit_spirit_value          = 2.0;
      int    undulating_spirit_stacks                   = 2;
      int    undulating_spirit_max_stacks               = 4;
    } legendary;
    using legendary_t = RimeLegendaries;

    struct RimeOptions
    {
    } options;
    using options_t = RimeOptions;

    bool in_cascading_blitz = false;
    int  cascading_blitz_pending = 0;

    mutable target_specific_t<RimeTargetData> target_data;

    const RimeTargetData* find_target_data( const player_t* target ) const override
    {
      return target_data[ target ];
    }

    RimeTargetData* get_target_data( player_t* target ) const override
    {
      RimeTargetData*& td = target_data[ target ];
      if ( !td )
      {
        td = new RimeTargetData( target, const_cast<RimePlayer*>( this ) );
      }
      return td;
    }

    RimeTargetData* GetTargetData( player_t* target ) const
    {
      return get_target_data( target );
    }

    const RimeTargetData* FindTargetData( const player_t* target ) const
    {
      return find_target_data( target );
    }

    double CurrentWinterOrbs( bool react = false ) const
    {
      return current_worbs( react );
    }

    double current_worbs( bool /* react */ = false ) const
    {
      return resources.current[ RESOURCE_WINTER_ORB ];
    }

    resource_e primary_resource() const override
    {
      return RESOURCE_SPIRIT;
    }

    role_e primary_role() const override
    {
      return ROLE_SPELL;
    }

    std::string default_flask() const override { return "disabled"; }
    std::string default_potion() const override { return "disabled"; }
    std::string default_food() const override { return "disabled"; }
    std::string default_rune() const override { return "disabled"; }
    std::string default_temporary_enchant() const override { return "disabled"; }

    stat_e convert_hybrid_stat( stat_e s ) const override
    {
      switch ( s )
      {
        case STAT_STR_AGI_INT:
        case STAT_AGI_INT:
        case STAT_STR_INT:
          return STAT_INTELLECT;
        case STAT_STR_AGI:
        case STAT_BONUS_ARMOR:
          return STAT_NONE;
        default:
          return s;
      }
    }

    double composite_attribute_multiplier( attribute_e a ) const override
    {
      return fs_player_t::composite_attribute_multiplier( a );
    }

    double composite_spell_haste() const override
    {
      return fs_player_t::composite_spell_haste();
    }

    double composite_spell_crit_chance() const override
    {
      return fs_player_t::composite_spell_crit_chance();
    }

    double composite_damage_versatility() const override
    {
      return fs_player_t::composite_damage_versatility();
    }

    double composite_heal_versatility() const override
    {
      return fs_player_t::composite_heal_versatility();
    }

    double composite_leech() const override
    {
      return fs_player_t::composite_leech();
    }

    double matching_gear_multiplier( attribute_e ) const override
    {
      return 0.0;
    }

    double composite_player_multiplier( school_e school ) const override
    {
      double m = fs_player_t::composite_player_multiplier( school );
      m *= 1.04; // Datamined BalancingDamageAura for Rime (hero_data.json)
      m *= 1.0 + buffs.ice_blitz->check_value();
      m *= 1.0 + buffs.ultimate_buff_window->check_value();
      return m;
    }

    double composite_player_pet_damage_multiplier( const action_state_t* s, bool guardian ) const override
    {
      return fs_player_t::composite_player_pet_damage_multiplier( s, guardian );
    }

    double composite_player_target_multiplier( player_t* target, school_e school ) const override
    {
      return fs_player_t::composite_player_target_multiplier( target, school );
    }

    double composite_player_target_crit_chance( player_t* target ) const override
    {
      return fs_player_t::composite_player_target_crit_chance( target );
    }

    double composite_player_critical_damage_multiplier( const action_state_t* s ) const override
    {
      double m = fs_player_t::composite_player_critical_damage_multiplier( s );
      if ( talents_enabled( rime_t::BITING_COLD ) )
      {
        m *= 1.0 + talents.biting_cold_crit_power;
      }
      return m;
    }

    double composite_player_target_armor( player_t* ) const override
    {
      return 0.0;
    }

    double non_stacking_movement_modifier() const override
    {
      return fs_player_t::non_stacking_movement_modifier();
    }

    double stacking_movement_modifier() const override
    {
      return fs_player_t::stacking_movement_modifier();
    }

    double composite_action_da_multiplier( const action_state_t* state ) const override
    {
      double m = fs_player_t::composite_action_da_multiplier( state );
      if ( buffs.winters_embrace->check() )
      {
        if ( state->action->id != 11 && state->action->id != 12 )
        {
          m *= ( 1.0 + buffs.winters_embrace->check_value() );
        }
      }
      return m;
    }

    double composite_action_ta_multiplier( const action_state_t* state ) const override
    {
      double m = fs_player_t::composite_action_ta_multiplier( state );
      if ( buffs.winters_embrace->check() )
      {
        if ( state->action->id != 11 && state->action->id != 12 )
        {
          m *= ( 1.0 + buffs.winters_embrace->check_value() );
        }
      }
      return m;
    }

    double composite_mastery() const override
    {
      return fs_player_t::composite_mastery();
    }

    void invalidate_cache( cache_e c ) override
    {
      fs_player_t::invalidate_cache( c );
    }

    void init_base_stats() override
    {
      if ( base.distance < 1 )
        base.distance = 5;

      fs_player_t::init_base_stats();

      base.stats.attribute[ STAT_INTELLECT ] = 100;
      resources.base[ RESOURCE_HEALTH ]      = 1618;
      base.health_per_stamina               = 47.506;
      resources.base[ RESOURCE_ANIMA ]      = 18;
      resources.base[ RESOURCE_WINTER_ORB ] = 5;

      base_gcd = timespan_t::from_seconds( 1.5 );
      min_gcd  = timespan_t::from_seconds( 0.0 );

      if ( legendary.undulating_spirit )
      {
        resources.start_at[ RESOURCE_SPIRIT ] += legendary.undulating_spirit_additional_spirit;
      }
    }

    void init_spells() override
    {
      fs_player_t::init_spells();
    }

    void init_talents() override
    {
      fs_player_t::init_talents();

      auto talentList = util::string_split<std::string_view>( talents_str, "/" );
      for ( const auto talent : talentList )
      {
        auto talent_split = util::string_split<std::string_view>( talent, ":" );
        if ( talent_split.size() != 2 )
        {
          sim->error( "Invalid talent string {}", talent );
          sim->cancel();
          return;
        }

        auto ranks = util::to_unsigned( talent_split[ 1 ] );

        for ( rime_talents_t t = static_cast<rime_talents_t>( 1U ); t < rime_talents_t::MAX; t++ )
        {
          if ( util::str_compare_ci( talent_split[ 0 ], talent_name( t ) ) )
          {
            set_talent_points( t, ranks >= 1 );
            break;
          }
        }
      }
    }

    void init_gains() override
    {
      fs_player_t::init_gains();

      gains.anima_worbs  = gains.AnimaWinterOrbs    = get_gain( "Anima Worbs" );
      gains.ult_worbs    = gains.UltimateWinterOrbs = get_gain( "Ultimate Worbs" );
      gains.spirit_procs = gains.SpiritProcs        = get_gain( "Spirit Procs" );
    }

    void init_procs() override
    {
      fs_player_t::init_procs();

      procs.coal_no_targets = procs.CoalescingFrostNoTargets = get_proc( "Coalescing Frost No Targets" );
    }

    void init_rng() override
    {
      fs_player_t::init_rng();

      if ( talents_enabled( rime_t::SOULFROST_TORRENT ) )
        rngs.soulfrost_torrent = get_rppm( "soulfrost_torrent", talents.soulfrost_torrent_rppm, 1.0, RPPM_HASTE );

      if ( talents_enabled( rime_t::FROSTWEAVERS_WRATH ) )
        rngs.frostweavers_wrath =
            get_accumulated_rng( "frostweavers_wrath", rng::CfromP( talents.frostweavers_wrath_chance_per_orb ) );

      if ( talents_enabled( rime_t::BURSTING_SWALLOWS ) )
        rngs.bursting_swallows =
            get_accumulated_rng( "bursting_swallows", rng::CfromP( talents.bursting_swallows_chance ) );

      if ( talents_enabled( rime_t::COLD_SHOWER ) )
        rngs.cold_shower = get_accumulated_rng( "cold_shower", rng::CfromP( talents.cold_shower_chance ) );

      rngs.avalanche_double = get_accumulated_rng( "avalanche_double", rng::CfromP( talents.avalanche_double ) );
      rngs.avalanche_triple = get_accumulated_rng( "avalanche_triple", rng::CfromP( talents.avalanche_triple ) );
    }

    void init_scaling() override
    {
      fs_player_t::init_scaling();

      scaling->disable( STAT_STRENGTH );
      scaling->disable( STAT_AGILITY );

      if ( !scale_player || sim->scaling->scale_stat == STAT_NONE )
      {
        return;
      }
    }

    void init_resources( bool force ) override
    {
      fs_player_t::init_resources( force );
      resources.current[ RESOURCE_WINTER_ORB ] = 0;
    }

    void create_cooldowns()
    {
      cooldowns.bursting_ice        = get_cooldown( "bursting_ice" );
      cooldowns.cold_snap           = get_cooldown( "cold_snap" );
      cooldowns.flight_of_the_navir = get_cooldown( "flight_of_the_navir" );
      cooldowns.freezing_torrent    = get_cooldown( "freezing_torrent" );
      cooldowns.ice_blitz           = get_cooldown( "ice_blitz" );
      cooldowns.winters_blessing    = get_cooldown( "winters_blessing" );
    }

    void create_buffs() override;

    void create_options() override
    {
      fs_player_t::create_options();

      add_option( opt_bool( "legendary.frostwyrms_spite", legendary.frostwyrms_spite ) );
      add_option( opt_bool( "legendary.skandis_decree", legendary.skandis_decree ) );
      add_option( opt_bool( "legendary.undulating_spirit", legendary.undulating_spirit ) );
    }

    void copy_from( player_t* source ) override
    {
      rime_t* rime = static_cast<rime_t*>( source );
      fs_player_t::copy_from( source );

      talents   = rime->talents;
      legendary = rime->legendary;
      options   = rime->options;
    }

    std::string create_profile( save_e stype ) override
    {
      std::string profile_str = fs_player_t::create_profile( stype );
      if ( !( stype & SAVE_PLAYER ) && !( stype & SAVE_GEAR ) )
      {
        return profile_str;
      }
      return profile_str;
    }

    void init_items() override
    {
      fs_player_t::init_items();
      for ( auto const& item : items )
      {
        if ( item.name_str.find( "undulating_spirit" ) != std::string::npos ||
             item.name_str.find( "eldrin_signet" ) != std::string::npos )
        {
          legendary.undulating_spirit = true;
        }
      }
    }

    void init_special_effects() override
    {
      fs_player_t::init_special_effects();
      if ( legendary.undulating_spirit )
      {
        spirit_refund_mul = legendary.undulating_spirit_spirit_value;
      }
    }

    void init_finished() override
    {
      fs_player_t::init_finished();
      if ( legendary.undulating_spirit && resources.start_at[ RESOURCE_SPIRIT ] < legendary.undulating_spirit_additional_spirit )
      {
        resources.start_at[ RESOURCE_SPIRIT ] += legendary.undulating_spirit_additional_spirit;
      }
    }

    void reset() override
    {
      fs_player_t::reset();
    }

    void activate() override
    {
      fs_player_t::activate();
    }

    void arise() override
    {
      fs_player_t::arise();
      resources.current[ RESOURCE_ANIMA ]      = 0;
      resources.current[ RESOURCE_WINTER_ORB ] = 0;
      in_cascading_blitz                       = false;
      cascading_blitz_pending                  = 0;
    }

    void combat_begin() override
    {
      fs_player_t::combat_begin();
    }

    void handle_wisdom_of_the_north( int orbs_spent )
    {
      if ( !talent_enabled( rime_t::WISDOM_OF_THE_NORTH ) )
        return;

      timespan_t total_reduction = -orbs_spent * talents.wisdom_of_the_north_cdr;

      cooldowns.ice_blitz->adjust( total_reduction );
      cooldowns.flight_of_the_navir->adjust( total_reduction );
      cooldowns.winters_blessing->adjust( total_reduction );
    }

    double resource_gain( resource_e resource_type, double amount, gain_t* source = nullptr, action_t* action = nullptr ) override;

    void init_action_list() override
    {
      if ( !action_list_str.empty() )
      {
        fs_player_t::init_action_list();
        return;
      }

      clear_action_priority_lists();
      use_default_action_list = true;
      fs_player_t::init_action_list();
    }

    std::unique_ptr<expr_t> create_action_expression( action_t& action, std::string_view name_str ) override
    {
      return fs_player_t::create_action_expression( action, name_str );
    }

    std::unique_ptr<expr_t> create_expression( util::string_view name_str ) override
    {
      auto split = util::string_split<util::string_view>( name_str, "." );

      if ( split[ 0 ] == "winter_orbs" || split[ 0 ] == "worb" || split[ 0 ] == "worbs" )
      {
        if ( split.size() == 1 )
        {
          return make_fn_expr( name_str, [ this ] { return this->current_worbs( true ); } );
        }

        if ( split.size() == 2 && split[ 1 ] == "deficit" )
        {
          return make_fn_expr( name_str,
                               [ this ] { return resources.max[ RESOURCE_WINTER_ORB ] - this->current_worbs( true ); } );
        }
      }
      else if ( util::str_compare_ci( split[ 0 ], "talent" ) )
      {
        if ( split.size() == 2 )
        {
          for ( rime_talents_t t = static_cast<rime_talents_t>( 1U ); t < rime_talents_t::MAX; t++ )
          {
            if ( util::str_compare_ci( split[ 1 ], talent_name( t ) ) )
            {
              return make_fn_expr( name_str, std::bind( std::mem_fn( &rime_t::talents_enabled ), this, t ) );
            }
          }
        }
      }
      else if ( util::str_compare_ci( split[ 0 ], "legendary" ) )
      {
        if ( split.size() == 2 )
        {
          if ( util::str_compare_ci( split[ 1 ], "frostwyrms_spite" ) )
            return make_ref_expr( name_str, legendary.frostwyrms_spite );
          if ( util::str_compare_ci( split[ 1 ], "skandis_decree" ) )
            return make_ref_expr( name_str, legendary.skandis_decree );
          if ( util::str_compare_ci( split[ 1 ], "undulating_spirit" ) )
            return make_ref_expr( name_str, legendary.undulating_spirit );
        }
      }

      return fs_player_t::create_expression( name_str );
    }

    std::unique_ptr<expr_t> create_resource_expression( util::string_view name ) override
    {
      return fs_player_t::create_resource_expression( name );
    }

    action_t* create_action( util::string_view name, util::string_view options ) override;
    void      init_background_actions() override;

    RimePlayer( sim_t* sim, util::string_view name, race_e r = RACE_NONE )
      : fs_player_t( sim, name, r, RIME ), target_data()
    {
      create_cooldowns();
      spirit_refund_mul = spell_const.spirit_refund_mul;
    }
  };
}

