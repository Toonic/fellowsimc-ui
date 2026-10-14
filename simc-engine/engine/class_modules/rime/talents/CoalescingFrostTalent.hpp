#pragma once

#include "buff/buff.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Coalescing Frost. Accumulates frost stacks on the target that detonate upon expiration or reaching cap.
  /// </summary>
  struct CoalescingFrostTalent
  {
    static inline constexpr timespan_t BaseDuration             = timespan_t::from_seconds( 3.0 );
    static inline constexpr double     BaseDamagePerStack       = 0.56;
    static inline constexpr double     CriticalExtraChance      = 0.5;
    static inline constexpr int        CriticalAddedStacks      = 2;
    static inline constexpr int        MaximumStacks            = 30;
    static inline constexpr double     AoeFalloffTargetCount    = 5.0;

    /// <summary>
    /// Creates and configures the Coalescing Frost debuff on target data, wiring its expiration detonation.
    /// </summary>
    template <typename TTargetData, typename TSourcePlayer>
    static buff_t* CreateDebuff( TTargetData& targetData, TSourcePlayer* source )
    {
      return make_buff( targetData, "coalescing_frost" )
        ->set_duration( BaseDuration )
        ->set_refresh_behavior( buff_refresh_behavior::DURATION )
        ->set_max_stack( MaximumStacks )
        ->add_stack_change_callback( [ source ]( buff_t* buff, int oldStacks, int newStacks ) {
          if ( !newStacks && oldStacks )
          {
            auto* damage = source->actions.coalescing_frost;
            if ( !buff->player->is_sleeping() )
            {
              damage->set_target( buff->player );
            }
            else
            {
              for ( auto* enemy : buff->sim->target_non_sleeping_list )
              {
                if ( !enemy->is_sleeping() )
                {
                  damage->set_target( enemy );
                  break;
                }
              }
            }
            if ( !damage->target->is_sleeping() )
            {
              action_state_t* damageState = damage->get_state();
              damageState->target         = damage->target;

              damage->snapshot_state( damageState, result_amount_type::DMG_DIRECT );
              damageState->da_multiplier *= oldStacks;
              damage->schedule_execute( damageState );
            }
            else
            {
              buff->sim->print_debug( "{} tried to execute {} on {} but all targets were dead.",
                                      *buff->source, *damage, *buff->player );
              source->procs.coal_no_targets->occur();
            }
          }
        } );
    }
  };
}
