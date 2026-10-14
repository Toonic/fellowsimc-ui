#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/spells/FlightOfTheNavir.hpp"
#include "class_modules/rime/talents/ChillingFinesse.hpp"
#include "class_modules/rime/talents/CoalescingFrostTalent.hpp"
#include "class_modules/rime/talents/ColdShower.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "class_modules/rime/talents/SoulfrostTorrent.hpp"
#include "class_modules/rime/talents/SupremeTorrent.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  template <typename TBaseAction>
  struct FreezingTorrentState : public rime_action_state_t<TBaseAction>
  {
    using Base = rime_action_state_t<TBaseAction>;

    bool soulfrost_torrent = false;

    FreezingTorrentState( action_t* action, player_t* target )
      : Base( action, target ), soulfrost_torrent( false )
    {
    }

    void initialize() override
    {
      Base::initialize();
      soulfrost_torrent = false;
    }

    void copy_state( const action_state_t* other ) override
    {
      Base::copy_state( other );
      const auto* torrentState = debug_cast<const FreezingTorrentState*>( other );
      soulfrost_torrent = torrentState->soulfrost_torrent;
    }

    double composite_crit_chance() const override
    {
      auto crit = Base::composite_crit_chance();
      if ( soulfrost_torrent )
      {
        crit += talents::SoulfrostTorrent::CriticalStrikeChanceBonus;
      }
      return crit;
    }
  };

  /// <summary>
  /// Channeled ability: Freezing Torrent. Channels a torrent of frost dealing ticking damage
  /// and generating Anima per tick. Modified by Supreme Torrent and Soulfrost Torrent.
  /// Spawns Coalescing Frost stacks on targets and triggers Cold Shower / Navir procs.
  /// </summary>
  class FreezingTorrent : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double     BaseTickDamageCoefficient = 1.4806;
    static inline constexpr timespan_t BaseDuration              = timespan_t::from_seconds( 2.0 );
    static inline constexpr timespan_t BaseTickPeriod            = timespan_t::from_seconds( 0.2 );
    static inline constexpr timespan_t BaseCooldown              = timespan_t::from_seconds( 15.0 );
    static inline constexpr int        AnimaPerTick              = 1;

    FreezingTorrent( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 13;
      name_str_reporting = "Freezing Torrent";

      spell_power_mod.tick = BaseTickDamageCoefficient;

      dot_duration           = BaseDuration;
      base_tick_time         = BaseTickPeriod;
      hasted_ticks           = true;
      dot_allow_partial_tick = true;
      tick_on_application    = true;
      channeled              = true;
      update_flags          |= STATE_HASTE;

      if ( player->talents_enabled( rime_t::SUPREME_TORRENT ) )
      {
        dot_duration += talents::SupremeTorrent::BonusDuration;
        spell_power_mod.tick *= 1.0 + talents::SupremeTorrent::DamageAmplification;
      }

      if ( player->talents_enabled( rime_t::COALESCING_FROST ) )
      {
        add_child( player->actions.coalescing_frost );
      }

      if ( player->talents_enabled( rime_t::COLD_SHOWER ) )
      {
        add_child( player->actions.ice_comet_cold_shower );
      }

      energize_type     = action_energize::PER_TICK;
      energize_resource = RESOURCE_ANIMA;
      energize_amount   = AnimaPerTick;

      cooldown->duration = BaseCooldown;
      cooldown->hasted   = false;
      cooldown->charges  = 1;

      ability_flags |= ability_type_e::ABILITY_CORE;
    }

    static const FreezingTorrentState<base_t>* cast_state( const action_state_t* state )
    {
      return debug_cast<const FreezingTorrentState<base_t>*>( state );
    }

    static FreezingTorrentState<base_t>* cast_state( action_state_t* state )
    {
      return debug_cast<FreezingTorrentState<base_t>*>( state );
    }

    action_state_t* new_state() override
    {
      return new FreezingTorrentState<base_t>( this, target );
    }

    void update_state( action_state_t* state, unsigned flags, result_amount_type rt ) override
    {
      base_t::update_state( state, flags, rt );
    }

    void snapshot_state( action_state_t* state, result_amount_type rt ) override
    {
      auto* torrentState = cast_state( state );
      torrentState->soulfrost_torrent = ( p()->buffs.soulfrost_torrent->check() > 0 );
      base_t::snapshot_state( state, rt );
    }

    void execute() override
    {
      base_t::execute();
      sim->print_debug( "{}'s should be executing a torrent", *p() );
      p()->buffs.soulfrost_torrent->decrement();
    }

    void init_finished() override
    {
      base_t::init_finished();
      update_flags &= ~STATE_HASTE;
    }

    double tick_time_pct_multiplier( const action_state_t* state ) const override
    {
      auto baseRate = base_t::tick_time_pct_multiplier( state );
      if ( cast_state( state )->soulfrost_torrent )
      {
        baseRate /= talents::SoulfrostTorrent::TickrateMultiplier;
      }
      return baseRate;
    }

    void tick( dot_t* dot ) override
    {
      base_t::tick( dot );
      if ( !dot->is_ticking() )
        return;

      if ( p()->talents_enabled( rime_t::COALESCING_FROST ) )
      {
        if ( !p()->get_target_data( dot->target )->debuffs.coalescing_frost->check() )
        {
          sim->print_debug( "{}'s Freezing Torrent tick triggers Coalescing Frost on {}. Target is sleeping: {}", *p(),
                            *dot->target, dot->target->is_sleeping() );
        }
        if ( result_is_hit( dot->state->result ) )
        {
          if ( dot->state->result == RESULT_CRIT && rng().roll( talents::CoalescingFrostTalent::CriticalExtraChance ) )
          {
            p()->get_target_data( dot->target )
                ->debuffs.coalescing_frost->trigger( talents::CoalescingFrostTalent::CriticalAddedStacks );
          }
          else
          {
            p()->get_target_data( dot->target )->debuffs.coalescing_frost->trigger();
          }
        }
      }

      if ( p()->talents_enabled( rime_t::COLD_SHOWER ) && p()->rngs.cold_shower->trigger() )
      {
        p()->actions.ice_comet_cold_shower->execute();
      }

      if ( p()->talents_enabled( rime_t::CHILLING_FINESSE ) )
      {
        p()->cooldowns.bursting_ice->adjust( -talents::ChillingFinesse::BurstingIceCooldownReduction );
      }

      if ( p()->buffs.flight_of_the_navir->check() )
      {
        for ( auto i = 0; i < FlightOfTheNavir::BirdsPerTorrentTick; ++i )
        {
          p()->actions.frost_swallow->execute();
        }
      }

      if ( p()->legendary.frostwyrms_spite )
      {
        p()->buffs.frostwyrms_spite->trigger();
      }
    }
  };

  using freezing_torrent_t = FreezingTorrent;
}
