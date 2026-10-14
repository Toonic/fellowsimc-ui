#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/spells/GlacialBlast.hpp"
#include "class_modules/rime/spells/RisingTalons.hpp"
#include "class_modules/rime/talents/FrostweaversWrath.hpp"
#include "class_modules/rime/talents/GlacialAssault.hpp"
#include "class_modules/rime/talents/GreaterGlacialBlast.hpp"
#include "class_modules/rime/talents/IcyFlow.hpp"
#include "class_modules/rime/talents/IcyTalons.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Single-target spender: Talon Strike. Consumes Winter Orbs to strike the target sequentially.
  /// Replaces Glacial Blast when Icy Talons is selected.
  /// </summary>
  class TalonStrike : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double BaseDamageCoefficient =
      GlacialBlast::BaseDamageCoefficient * fellowship::rime::talents::IcyTalons::SingleTargetMultiplier;
    static inline constexpr int    BaseWinterOrbCost     = 1;

    /// <summary>
    /// Individual hit spawned sequentially per consumed Winter Orb.
    /// </summary>
    struct TalonStrikeHit : public rime_spell_t
    {
      TalonStrikeHit( util::string_view name, rime_t* player )
        : rime_spell_t( name, player )
      {
        id                 = 95;
        background         = true;
        name_str_reporting = "Talon Strike";

        spell_power_mod.direct = BaseDamageCoefficient;
        if ( player->talents_enabled( rime_t::GREATER_GLACIAL_BLAST ) )
        {
          base_dd_multiplier *= 1.0 + fellowship::rime::talents::GreaterGlacialBlast::DamageAmplification;
        }

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

      void snapshot_state( action_state_t* state, result_amount_type rt ) override
      {
        auto* talonsState = cast_state( state );
        talonsState->glacial_assault_stacks = p()->buffs.glacial_assault->stack();
        base_t::snapshot_state( state, rt );
      }

      double composite_da_multiplier( const action_state_t* state ) const override
      {
        double multiplier = rime_spell_t::composite_da_multiplier( state );
        auto* talonsState = cast_state( state );
        if ( talonsState->glacial_assault_stacks == p()->buffs.glacial_assault->max_stack() )
        {
          multiplier *= 1.0 + talents::GlacialAssault::DamageAmplification;
        }
        return multiplier;
      }

      double composite_crit_chance() const override
      {
        return rime_spell_t::composite_crit_chance() + p()->buffs.icy_flow->check_value() +
               p()->buffs.frostweavers_wrath->check_value();
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

      void impact( action_state_t* state ) override
      {
        rime_spell_t::impact( state );

        if ( cast_state( state )->glacial_assault_stacks == p()->buffs.glacial_assault->max_stack() && p()->actions.glacial_assault )
        {
          p()->actions.glacial_assault->execute_on_target( state->target, state->result_amount * talents::GlacialAssault::CleaveMultiplier );
        }
      }
    };

    using talon_strike_hit_t = TalonStrikeHit;

    TalonStrike( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 95;
      name_str_reporting = "Talon Strike";

      resource_current                  = RESOURCE_WINTER_ORB;
      base_costs[ RESOURCE_WINTER_ORB ] = BaseWinterOrbCost;
      ability_flags |= ability_type_e::ABILITY_POWER;

      add_child( player->actions.talon_strike_hit );
    }

    void init() override
    {
      rime_spell_t::init();
      if ( p()->actions.talon_strike_hit )
      {
        p()->actions.talon_strike_hit->init();
      }
    }

    bool ready() override
    {
      if ( !p()->talents_enabled( rime_t::ICY_TALONS ) )
        return false;

      return rime_spell_t::ready();
    }

    double cost() const override
    {
      if ( p()->buffs.glacial_assault->at_max_stacks() )
      {
        return 0.0;
      }

      return std::max( base_cost(), p()->resources.current[ RESOURCE_WINTER_ORB ] );
    }

    void execute() override
    {
      bool ga_max = p()->buffs.glacial_assault->at_max_stacks();
      int default_cp = ga_max ? 5 : static_cast<int>( std::max( 1.0, p()->resources.current[ RESOURCE_WINTER_ORB ] ) );
      int cp = replay_hit_count( default_cp );
      rime_spell_t::execute();

      for ( int i = 0; i < cp; ++i )
      {
        p()->actions.talon_strike_hit->set_target( target );

        auto* state = TalonStrikeHit::cast_state( p()->actions.talon_strike_hit->get_state() );
        p()->actions.talon_strike_hit->snapshot_state( state, result_amount_type::DMG_DIRECT );

        state->hit_number            = i;
        state->target                = target;
        state->persistent_multiplier = execute_state->persistent_multiplier;
        sim->print_debug( "{} schedules Talon Strike hit {} with persistent multiplier {:.2f}", *p(), i + 1,
                          state->persistent_multiplier );

        p()->actions.talon_strike_hit->schedule_execute( state );
      }

      p()->buffs.icy_flow->decrement();

      if ( p()->buffs.glacial_assault->at_max_stacks() )
      {
        p()->buffs.glacial_assault->expire();
      }
    }
  };

  using talon_strike_t = TalonStrike;
}
