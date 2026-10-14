#pragma once

#include "class_modules/fs_player.hpp"
#include "class_modules/rime/talents/CoalescingFrostTalent.hpp"

namespace fellowship::rime
{
  class RimePlayer;

  /// <summary>
  /// Manages target-specific DoTs, debuffs, and stack tracking for enemy targets against a Rime player.
  /// </summary>
  class RimeTargetData : public fellowship::fs_player_td_t
  {
  public:
    struct TargetDots
    {
      dot_t* bursting_ice     = nullptr;
      dot_t* freezing_torrent = nullptr;
    } dots;

    struct TargetDebuffs
    {
      buff_t* coalescing_frost = nullptr;
    } debuffs;

    template <typename TPlayer>
    RimeTargetData( player_t* target, TPlayer* source )
      : fellowship::fs_player_td_t( target, source ), dots(), debuffs()
    {
      dots.bursting_ice     = target->get_dot( "bursting_ice", source );
      dots.freezing_torrent = target->get_dot( "freezing_torrent", source );

      debuffs.coalescing_frost = fellowship::rime::talents::CoalescingFrostTalent::CreateDebuff( *this, source );
    }

    dot_t*  GetBurstingIceDot() const { return dots.bursting_ice; }
    dot_t*  GetFreezingTorrentDot() const { return dots.freezing_torrent; }
    buff_t* GetCoalescingFrostDebuff() const { return debuffs.coalescing_frost; }
  };

  using rime_td_t = RimeTargetData;
}
