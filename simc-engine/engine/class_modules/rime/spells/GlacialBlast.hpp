#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/FrostweaversWrath.hpp"
#include "class_modules/rime/talents/GlacialAssault.hpp"
#include "class_modules/rime/talents/GreaterGlacialBlast.hpp"
#include "class_modules/rime/talents/IcyFlow.hpp"
#include "class_modules/rime/talents/IcyTalons.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  template <typename TBaseAction>
  struct GlacialBlastState : public rime_action_state_t<TBaseAction>
  {
    using Base = rime_action_state_t<TBaseAction>;

    bool glacial_assault_max_stacks = false;

    GlacialBlastState( action_t* action, player_t* target )
      : Base( action, target ), glacial_assault_max_stacks( false )
    {
    }

    void initialize() override
    {
      Base::initialize();
      glacial_assault_max_stacks = false;
    }

    void copy_state( const action_state_t* other ) override
    {
      Base::copy_state( other );
      const auto* blastState = debug_cast<const GlacialBlastState*>( other );
      glacial_assault_max_stacks = blastState->glacial_assault_max_stacks;
    }
  };

  /// <summary>
  /// Primary Anima spender. Deals massive direct frost damage.
  /// Empowers through Glacial Assault and can trigger AoE Cleave.
  /// </summary>
  class GlacialBlast : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double     BaseDamageCoefficient = 10.24;
    static inline constexpr int        WinterOrbCost         = 2;
    static inline constexpr timespan_t BaseCastTime          = timespan_t::from_seconds( 2.0 );

    /// <summary>
    /// AoE Cleave sub-action triggered by Glacial Assault at maximum stacks.
    /// </summary>
    struct GlacialAssaultCleave : public rime_spell_t
    {
      GlacialAssaultCleave( util::string_view name, rime_t* player )
        : rime_spell_t( name, player )
      {
        id                  = 92;
        background          = true;
        may_crit            = false;
        may_miss            = false;
        name_str_reporting  = "Glacial Assault";
        aoe                 = -1;
        reduced_aoe_targets = talents::GlacialAssault::AoeFalloffTargetCount;
      }

      size_t available_targets( std::vector<player_t*>& targetList ) const override
      {
        targetList.clear();
        for ( auto* enemy : sim->target_non_sleeping_list )
        {
          if ( enemy->is_enemy() && ( enemy != target ) )
          {
            targetList.push_back( enemy );
          }
        }

        filter_replay_targets( targetList );
        return targetList.size();
      }

      void init_finished() override
      {
        rime_spell_t::init_finished();
        snapshot_flags &= STATE_NO_MULTIPLIER;
      }

      void execute() override
      {
        target_cache.is_valid = false;
        if ( target_list().size() == 0 )
          return;

        rime_spell_t::execute();
      }
    };

    using glacial_assault_cleave_t = GlacialAssaultCleave;

    GlacialBlast( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 92;
      name_str_reporting = "Glacial Blast";

      resource_current                  = RESOURCE_WINTER_ORB;
      base_costs[ RESOURCE_WINTER_ORB ] = WinterOrbCost;
      base_execute_time                 = BaseCastTime;
      spell_power_mod.direct            = BaseDamageCoefficient;

      if ( player->talents_enabled( rime_t::GREATER_GLACIAL_BLAST ) )
      {
        base_execute_time += fellowship::rime::talents::GreaterGlacialBlast::AddedCastTime;
        base_dd_multiplier *= 1.0 + fellowship::rime::talents::GreaterGlacialBlast::DamageAmplification;
      }

      ability_flags |= ability_type_e::ABILITY_POWER;
    }

    bool ready() override
    {
      if ( p()->talents_enabled( rime_t::ICY_TALONS ) )
        return false;

      return rime_spell_t::ready();
    }

    static const GlacialBlastState<base_t>* cast_state( const action_state_t* state )
    {
      return debug_cast<const GlacialBlastState<base_t>*>( state );
    }

    static GlacialBlastState<base_t>* cast_state( action_state_t* state )
    {
      return debug_cast<GlacialBlastState<base_t>*>( state );
    }

    action_state_t* new_state() override
    {
      return new GlacialBlastState<base_t>( this, target );
    }

    void update_state( action_state_t* state, unsigned flags, result_amount_type rt ) override
    {
      base_t::update_state( state, flags, rt );
    }

    void snapshot_state( action_state_t* state, result_amount_type rt ) override
    {
      auto* blastState = cast_state( state );
      blastState->glacial_assault_max_stacks = p()->buffs.glacial_assault->at_max_stacks();
      base_t::snapshot_state( state, rt );
    }

    timespan_t execute_time() const override
    {
      if ( p()->buffs.ultimate_buff_window->check() || p()->buffs.glacial_assault->at_max_stacks() )
        return timespan_t::zero();

      return base_t::execute_time();
    }

    double cost() const override
    {
      if ( p()->buffs.glacial_assault->at_max_stacks() )
      {
        return 0.0;
      }
      return base_t::cost();
    }

    double composite_da_multiplier( const action_state_t* state ) const override
    {
      double multiplier = rime_spell_t::composite_da_multiplier( state );
      if ( p()->buffs.glacial_assault->at_max_stacks() )
      {
        multiplier *= 1.0 + p()->buffs.glacial_assault->check_value();
      }
      return multiplier;
    }

    double composite_crit_chance() const override
    {
      return rime_spell_t::composite_crit_chance() + p()->buffs.icy_flow->check_value() +
             p()->buffs.frostweavers_wrath->check_value();
    }

    void impact( action_state_t* state ) override
    {
      rime_spell_t::impact( state );

      if ( cast_state( state )->glacial_assault_max_stacks && p()->actions.glacial_assault )
      {
        p()->actions.glacial_assault->execute_on_target( state->target, state->result_amount * talents::GlacialAssault::CleaveMultiplier );
      }
    }

    void schedule_execute( action_state_t* state ) override
    {
      if ( p()->buffs.icy_flow->up() )
      {
        p()->buffs.icy_flow_haste->trigger();
      }
      rime_spell_t::schedule_execute( state );
    }

    void interrupt_action() override
    {
      rime_spell_t::interrupt_action();
      p()->buffs.icy_flow_haste->expire();
    }

    void execute() override
    {
      rime_spell_t::execute();
      p()->buffs.icy_flow_haste->expire();

      if ( p()->buffs.glacial_assault->at_max_stacks() )
      {
        p()->buffs.glacial_assault->expire();
      }

      p()->buffs.frostweavers_wrath->decrement();
      p()->buffs.icy_flow->decrement();
    }
  };

  using glacial_blast_t = GlacialBlast;
}
