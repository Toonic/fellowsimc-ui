#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/spells/IceComet.hpp"
#include "class_modules/rime/talents/Avalanche.hpp"
#include "class_modules/rime/talents/FrostweaversWrath.hpp"
#include "class_modules/rime/talents/IcyFlow.hpp"
#include "class_modules/rime/talents/IcyTalons.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  template <typename T_ACTION>
  struct talons_action_state_t : public actions::rime_action_state_t<T_ACTION>
  {
    using base_t = actions::rime_action_state_t<T_ACTION>;

    int hit_number             = 0;
    int glacial_assault_stacks = 0;
    int pack_size              = 1;

    talons_action_state_t( action_t* action, player_t* target )
      : base_t( action, target ), hit_number( 0 ), glacial_assault_stacks( 0 ), pack_size( 1 )
    {
    }

    void initialize() override
    {
      base_t::initialize();

      hit_number             = 0;
      glacial_assault_stacks = 0;
      pack_size              = 1;
    }

    void copy_state( const action_state_t* s )
    {
      base_t::copy_state( s );
      const talons_action_state_t* rs = debug_cast<const talons_action_state_t*>( s );

      hit_number             = rs->hit_number;
      glacial_assault_stacks = rs->glacial_assault_stacks;
      pack_size              = rs->pack_size;
    }
  };

  /// <summary>
  /// Multi-hit spender: Rising Talons. Consumes Winter Orbs to launch sequential talon strikes.
  /// Replaces Ice Comet when Icy Talons is selected.
  /// </summary>
  class RisingTalons : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double BaseDamageCoefficient =
      IceComet::BaseDamageCoefficient * fellowship::rime::talents::IcyTalons::AreaOfEffectMultiplier;
    static inline constexpr int    BaseWinterOrbCost     = 1;

    /// <summary>
    /// Individual hit spawned sequentially per consumed Winter Orb.
    /// </summary>
    struct RisingTalonsHit : public rime_spell_t
    {
      RisingTalonsHit( util::string_view name, rime_t* player, util::string_view options = {} )
        : rime_spell_t( name, player, options )
      {
        id                 = 94;
        background         = true;
        name_str_reporting = "Rising Talons";

        spell_power_mod.direct = BaseDamageCoefficient;
        aoe                    = 0;
        ability_flags |= ability_type_e::ABILITY_POWER;
      }

      static const talons_action_state_t<base_t>* cast_state( const action_state_t* state )
      {
        return debug_cast<const talons_action_state_t<base_t>*>( state );
      }

      static talons_action_state_t<base_t>* cast_state( action_state_t* state )
      {
        return debug_cast<talons_action_state_t<base_t>*>( state );
      }

      action_state_t* new_state() override
      {
        return new talons_action_state_t<base_t>( this, target );
      }

      double composite_crit_chance() const override
      {
        return rime_spell_t::composite_crit_chance() + p()->buffs.icy_flow->check_value() +
               p()->buffs.frostweavers_wrath->check_value();
      }

      double composite_da_multiplier( const action_state_t* state ) const override
      {
        double multiplier = rime_spell_t::composite_da_multiplier( state );
        const auto* talonsState = cast_state( state );
        if ( talonsState && talonsState->pack_size > 12 )
        {
          multiplier *= std::sqrt( 12.0 / talonsState->pack_size );
        }
        return multiplier;
      }

      void schedule_execute( action_state_t* state ) override
      {
        if ( !state )
        {
          state         = get_state( state );
          state->target = target;
          snapshot_state( state, result_amount_type::DMG_DIRECT );
        }

        p()->buffs.frostweavers_wrath->decrement();
        rime_spell_t::schedule_execute( state );
      }

      timespan_t distance_targeting_travel_time( action_state_t* state ) const override
      {
        return timespan_t::zero();
      }
    };

    using rising_talons_hit_t = RisingTalonsHit;

    RisingTalons( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 93;
      name_str_reporting = "Rising Talons";

      add_child( player->actions.rising_talon_hit );

      if ( player->talents_enabled( rime_t::ICY_TALONS ) && player->talents_enabled( rime_t::AVALANCHE ) )
      {
        add_child( player->actions.ice_comet_avalanche );
      }

      resource_current                  = RESOURCE_WINTER_ORB;
      base_costs[ RESOURCE_WINTER_ORB ] = BaseWinterOrbCost;
      aoe                               = -1;
      ability_flags |= ability_type_e::ABILITY_POWER;
    }

    bool ready() override
    {
      if ( !p()->talents_enabled( rime_t::ICY_TALONS ) )
        return false;

      return rime_spell_t::ready();
    }

    double cost() const override
    {
      return std::max( base_cost(), p()->resources.current[ RESOURCE_WINTER_ORB ] );
    }

    void execute() override
    {
      auto orbs = std::max( 1.0, p()->resources.current[ RESOURCE_WINTER_ORB ] );

      rime_spell_t::execute();

      target_cache.is_valid = false;
      auto targets = target_list();
      if ( targets.empty() && target )
      {
        targets.push_back( target );
      }

      int default_hits = static_cast<int>( orbs * targets.size() );
      int total_to_schedule = replay_hit_count( default_hits );

      if ( !targets.empty() )
      {
        for ( int scheduled = 0; scheduled < total_to_schedule; ++scheduled )
        {
          auto* enemy = targets[ scheduled % targets.size() ];
          p()->actions.rising_talon_hit->set_target( enemy );

          auto* state = RisingTalonsHit::cast_state( p()->actions.rising_talon_hit->get_state() );
          state->hit_number            = scheduled % (int)targets.size();
          state->pack_size             = (int)targets.size();
          state->target                = enemy;
          state->persistent_multiplier = execute_state->persistent_multiplier;

          p()->actions.rising_talon_hit->snapshot_state( state, result_amount_type::DMG_DIRECT );
          p()->actions.rising_talon_hit->schedule_execute( state );
        }
      }

      p()->buffs.icy_flow->decrement();

      if ( p()->talents_enabled( rime_t::AVALANCHE ) )
      {
        if ( p()->rng().roll( fellowship::rime::talents::Avalanche::DoubleProcChance ) )
        {
          p()->actions.ice_comet_avalanche->trigger_secondary_action( target, 0.3_s );
        }

        if ( p()->rng().roll( fellowship::rime::talents::Avalanche::TripleProcChance ) )
        {
          p()->actions.ice_comet_avalanche->trigger_secondary_action( target, 0.6_s );
        }
      }
    }
  };

  using rising_talons_t = RisingTalons;
}
