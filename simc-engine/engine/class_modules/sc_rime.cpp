#include "fs_player.hpp"
#include "util/util.hpp"
#include "simulationcraft.hpp"


#include "class_modules/rime/RimePlayer.hpp"
#include "class_modules/rime/RimeTargetData.hpp"

namespace fellowship
{
namespace rime
{

namespace actions
{

template <typename Base>
struct secondary_action_trigger_t : public event_t
{
  Base* action;
  action_state_t* state;
  player_t* target;

  secondary_action_trigger_t( action_state_t* s, timespan_t delay = timespan_t::zero() )
    : event_t( *s->action->sim, delay ), action( dynamic_cast<Base*>( s->action ) ), state( s ), target( nullptr )
  {
  }

  secondary_action_trigger_t( player_t* target, Base* action, timespan_t delay = timespan_t::zero() )
    : event_t( *action->sim, delay ), action( action ), state( nullptr ), target( target )
  {
  }

  const char* name() const override
  {
    return "secondary_action_trigger";
  }

  void execute() override
  {
    assert( action->is_secondary_action() );

    player_t* action_target = state ? state->target : target;

    // Ensure target is still available and did not demise during delay.
    if ( !action_target || action_target->is_sleeping() )
      return;

    action->set_target( action_target );

    // No state, construct one and grab combo points from the event instead of current CP amount.
    if ( !state )
    {
      state         = action->get_state();
      state->target = action_target;
      action->snapshot_internal( state, STATE_CRIT, action->amount_type( state ) );
    }

    assert( !action->pre_execute_state );

    action->pre_execute_state = state;
    action->snapshot_internal( state, action->snapshot_flags & ~STATE_CRIT, action->amount_type( state ) );
    action->execute();
    state = nullptr;
  }

  ~secondary_action_trigger_t() override
  {
    if ( state )
      action_state_t::release( state );
  }
};

template <typename T_ACTION>
struct rime_action_state_t : public action_state_t
{
private:
  T_ACTION* action;

public:
  rime_action_state_t( action_t* action, player_t* target )
    : action_state_t( action, target ), action( dynamic_cast<T_ACTION*>( action ) )
  {
  }

  rime_t* p() const
  {
    return debug_cast<rime_t*>( action->player );
  }

  rime_t* p()
  {
    return debug_cast<rime_t*>( action->player );
  }

  void initialize() override
  {
    action_state_t::initialize();
  }

  std::ostringstream& debug_str( std::ostringstream& s ) override
  {
    return action_state_t::debug_str( s );
  }

  void copy_state( const action_state_t* s )
  {
    action_state_t::copy_state( s );
    const rime_action_state_t* rs = debug_cast<const rime_action_state_t*>( s );
  }

  T_ACTION* get_action() const
  {
    return action;
  }
};

template <typename Base>
class rime_action_t : public Base
{
protected:
  /// typedef for rime_action_t<action_base_t>
  using base_t = rime_action_t<Base>;

private:
  /// typedef for the templated action type, eg. spell_t, attack_t, heal_t
  using ab = Base;

public:
  secondary_trigger secondary_trigger_type;

  // Init =====================================================================

  rime_action_t( util::string_view n, rime_t* p, util::string_view options = {} )
    : ab( n, p, options ), secondary_trigger_type( secondary_trigger::NONE )
  {
    ab::parse_options( options );
    ab::may_crit = ab::tick_may_crit = true;
    ab::school                       = SCHOOL_FROST;

    // rime_t sets base and min GCD to 1.5_s hasted
    ab::gcd_type = gcd_haste_type::SPELL_HASTE;
  }

  void init() override
  {
    ab::init();
  }

  // Type Wrappers ============================================================

  static const rime_action_state_t<base_t>* cast_state( const action_state_t* st )
  {
    return debug_cast<const rime_action_state_t<base_t>*>( st );
  }

  static rime_action_state_t<base_t>* cast_state( action_state_t* st )
  {
    return debug_cast<rime_action_state_t<base_t>*>( st );
  }

  rime_t* p()
  {
    return debug_cast<rime_t*>( ab::player );
  }

  const rime_t* p() const
  {
    return debug_cast<const rime_t*>( ab::player );
  }

  rime_td_t* td( player_t* t ) const
  {
    return p()->get_target_data( t );
  }

  // Action State =============================================================

  action_state_t* new_state() override
  {
    return new rime_action_state_t<base_t>( this, ab::target );
  }

  void update_state( action_state_t* state, unsigned flags, result_amount_type rt ) override
  {
    ab::update_state( state, flags, rt );
  }

  void snapshot_state( action_state_t* state, result_amount_type rt ) override
  {
    ab::snapshot_state( state, rt );
  }

  // Secondary Trigger Functions ==============================================

  bool is_secondary_action() const
  {
    return secondary_trigger_type != secondary_trigger::NONE;
  }

  virtual void trigger_secondary_action( player_t* target, timespan_t delay = timespan_t::zero() )
  {
    assert( is_secondary_action() );
    make_event<secondary_action_trigger_t<base_t>>( *ab::sim, target, this, delay );
  }

  virtual void trigger_secondary_action( action_state_t* s, timespan_t delay = timespan_t::zero() )
  {
    assert( is_secondary_action() && s->action == this );
    make_event<secondary_action_trigger_t<base_t>>( *ab::sim, s, delay );
  }

  // Residual Trigger Functions ===============================================

  virtual void trigger_residual_action( const action_state_t* s, double multiplier = 1.0, bool unmitigated = true,
                                        bool reverse_target_da_multiplier = true, player_t* override_target = nullptr,
                                        bool trigger_event = true )
  {
    const double base_damage = unmitigated ? s->result_total : s->result_amount;
    const double target_da_multiplier =
        ( unmitigated && reverse_target_da_multiplier ) ? ( 1.0 / s->target_da_multiplier ) : 1.0;
    const double amount = base_damage * multiplier * target_da_multiplier;

    if ( amount <= 0 )
      return;

    player_t* primary_target = override_target ? override_target : s->target;

    p()->sim->print_debug( "{} triggers residual {} for {:.2f} damage ({:.2f} * {} * {:.3f}) on {}", *p(), *this,
                           amount, base_damage, multiplier, target_da_multiplier, *primary_target );

    if ( !ab::callbacks || !trigger_event )
    {
      ab::execute_on_target( primary_target, amount );
    }
    else
    {
      make_event( *p()->sim, 0_ms,
                  [ this, amount, primary_target ]() { ab::execute_on_target( primary_target, amount ); } );
    }
  }

  virtual void trigger_residual_action( player_t* primary_target, double amount, bool trigger_event = true )
  {
    if ( amount <= 0 )
      return;

    p()->sim->print_debug( "{} triggers residual {} for {:.2f} damage on {}", *p(), *this, amount, *primary_target );

    if ( !ab::callbacks || !trigger_event )
    {
      ab::execute_on_target( primary_target, amount );
    }
    else
    {
      make_event( *p()->sim, 0_ms,
                  [ this, amount, primary_target ]() { ab::execute_on_target( primary_target, amount ); } );
    }
  }

  // Helper Functions =========================================================

  virtual double generate_anima() const
  {
    double cp = 0;

    if ( ab::energize_type != action_energize::NONE && ab::energize_resource == RESOURCE_ANIMA )
    {
      cp += ab::energize_amount;
    }

    return cp;
  }

public:
  void spend_winter_orbs( const action_state_t* );
  void gain_winter_orb( int );
  void gain_anima( int );
  void trigger_spirit_refund( const action_state_t*, double );

  // General Methods ==========================================================

  void update_ready( timespan_t cd_duration = timespan_t::min() ) override
  {
    if ( secondary_trigger_type != secondary_trigger::NONE )
    {
      cd_duration = timespan_t::zero();
    }

    ab::update_ready( cd_duration );
  }

  timespan_t gcd() const override
  {
    timespan_t t = ab::gcd();
    return t;
  }

  double composite_target_multiplier( player_t* target ) const override
  {
    double m = ab::composite_target_multiplier( target );
    return m;
  }

  double composite_target_crit_chance( player_t* target ) const override
  {
    double c = ab::composite_target_crit_chance( target );
    return c;
  }

  double composite_crit_chance() const override
  {
    double c = ab::composite_crit_chance();
    return c;
  }

  double composite_player_critical_multiplier( const action_state_t* s ) const override
  {
    return ab::composite_player_critical_multiplier( s );
  }

  double composite_target_crit_damage_bonus_multiplier( player_t* target ) const override
  {
    double cm = ab::composite_target_crit_damage_bonus_multiplier( target );
    return cm;
  }

  double total_crit_bonus( const action_state_t* state ) const override
  {
    double crit_bonus = ab::total_crit_bonus( state );
    return crit_bonus;
  }

  timespan_t tick_time( const action_state_t* state ) const override
  {
    timespan_t tt = ab::tick_time( state );
    return tt;
  }

  double cost_pct_multiplier() const override
  {
    double c = ab::cost_pct_multiplier();
    return c;
  }

  void consume_resource() override
  {
    if ( is_secondary_action() )
    {
      return;
    }

    auto cr = ab::current_resource();

    ab::consume_resource();

    if ( ab::base_cost() == 0 || ab::proc )
      return;

    if ( cr == RESOURCE_WINTER_ORB )
      spend_winter_orbs( ab::execute_state );
  }

  void execute() override
  {
    ab::execute();

    if ( p()->talents_enabled( rime_t::SOULFROST_TORRENT ) && !is_secondary_action() && !ab::background &&
         !ab::tick_action )
    {
      if ( !p()->buffs.soulfrost_torrent->check() && p()->rngs.soulfrost_torrent->trigger() )
      {
        p()->buffs.soulfrost_torrent->trigger();
      }
    }
  }

  void schedule_travel( action_state_t* state ) override
  {
    ab::schedule_travel( state );
  }

  bool ready() override
  {
    if ( !ab::ready() )
      return false;

    return true;
  }

  std::unique_ptr<expr_t> create_expression( std::string_view name ) override
  {
    if ( util::str_compare_ci( name, "anima_gain" ) )
    {
      return make_mem_fn_expr( "anima_gain", *this, &base_t::generate_anima );
    }

    return ab::create_expression( name );
  }
};

struct rime_heal_t : public rime_action_t<fellowship::actions::fs_player_action_t<heal_t>>
{
  rime_heal_t( util::string_view n, rime_t* p, util::string_view o = {} ) : base_t( n, p, o )
  {
    harmful = false;
    set_target( p );
  }
};

struct rime_spell_t : public rime_action_t<fellowship::actions::fs_player_action_t<spell_t>>
{
  rime_spell_t( util::string_view n, rime_t* p, util::string_view o = {} ) : base_t( n, p, o )
  {
  }
};

}  // namespace actions
}  // namespace rime
}  // namespace fellowship

#include "class_modules/rime/spells/FrostBolt.hpp"
#include "class_modules/rime/spells/GlacialBlast.hpp"
#include "class_modules/rime/spells/IceComet.hpp"
#include "class_modules/rime/spells/ColdSnap.hpp"
#include "class_modules/rime/spells/BurstingIce.hpp"
#include "class_modules/rime/spells/IceBlitz.hpp"
#include "class_modules/rime/spells/FlightOfTheNavir.hpp"
#include "class_modules/rime/spells/FrostSwallow.hpp"
#include "class_modules/rime/spells/WrathOfWinter.hpp"
#include "class_modules/rime/spells/WintersBlessing.hpp"
#include "class_modules/rime/spells/RisingTalons.hpp"
#include "class_modules/rime/spells/TalonStrike.hpp"
#include "class_modules/rime/spells/FreezingTorrent.hpp"
#include "class_modules/rime/spells/CoalescingFrostSpell.hpp"

namespace fellowship
{
namespace rime
{
namespace actions
{
using namespace fellowship::rime::spells;
}  // namespace actions

// ==========================================================================
// RimePlayer Action & Buff Initializations
// ==========================================================================

void RimePlayer::create_buffs()
{
  fs_player_t::create_buffs();

  buffs.icy_flow = fellowship::rime::talents::IcyFlow::CreateBuff( this );
  buffs.icy_flow_haste = fellowship::rime::talents::IcyFlow::CreateCastHasteBuff( this );

  buffs.flight_of_the_navir = make_buff<rime_buff_t>( this, "flight_of_the_navir" )->set_duration( 20_s );

  buffs.frostweavers_wrath = fellowship::rime::talents::FrostweaversWrath::CreateBuff( this );

  buffs.glacial_assault = fellowship::rime::talents::GlacialAssault::CreateBuff( this );

  buffs.ice_blitz = make_buff<rime_buff_t>( this, "ice_blitz" )
                        ->set_duration( 20_s )
                        ->set_default_value( 0.2 )
                        ->add_invalidate( CACHE_PLAYER_DAMAGE_MULTIPLIER );

  buffs.soulfrost_torrent = fellowship::rime::talents::SoulfrostTorrent::CreateBuff( this );

  buffs.ultimate_buff_window =
      make_buff<rime_buff_t>( this, "wrath_of_winter" )
          ->set_default_value( 0.2 )
          ->set_duration( 20_s )
          ->set_period( 4_s )
          ->set_tick_on_application( true )
          ->set_tick_callback( [ this ]( buff_t*, int, timespan_t ) {
            resource_gain( RESOURCE_WINTER_ORB, 1.0, gains.ult_worbs, actions.wrath_of_winter );
          } )
          ->add_invalidate( CACHE_PLAYER_DAMAGE_MULTIPLIER );

  buffs.winters_blessing = make_buff<rime_buff_t>( this, "winters_blessing" )
                               ->set_duration( 20_s )
                               ->set_default_value( 0.20 )
                               ->set_pct_buff_type( STAT_PCT_BUFF_MASTERY );

  buffs.winters_embrace = make_buff<rime_buff_t>( this, "winters_embrace" )->set_duration( 3_s )->set_default_value( 0.2 );

  buffs.frostwyrms_spite = make_buff<rime_buff_t>( this, "frostwyrms_spite" )
                               ->set_duration( legendary.frostwyrms_spite_duration )
                               ->set_max_stack( legendary.frostwyrms_spite_max_stacks )
                               ->set_default_value( legendary.frostwyrms_spite_dmg_per_stack )
                               ->set_refresh_behavior( buff_refresh_behavior::DURATION );

  buffs.undulating_spirit = make_buff<rime_buff_t>( this, "undulating_spirit" )
                               ->set_duration( 20_s )
                               ->set_max_stack( legendary.undulating_spirit_max_stacks );

  buffs.navirs_keeper = fellowship::rime::talents::NavirsKeeper::CreateBuff( this );
  buffs.harrowing_ice = fellowship::rime::talents::HarrowingIce::CreateBuff( this );
}

action_t* RimePlayer::create_action( util::string_view name, util::string_view options_str )
{
  using namespace actions;

  if ( name == "frost_bolt" )
    return new frost_bolt_t( name, this, options_str );
  if ( name == "glacial_blast" )
    return new glacial_blast_t( name, this, options_str );
  if ( name == "cold_snap" )
    return new cold_snap_t( name, this, options_str );
  if ( name == "winters_blessing" )
    return new winters_blessing_t( name, this, options_str );
  if ( name == "bursting_ice" )
  {
    if ( !actions.bursting_ice )
      actions.bursting_ice = new bursting_ice_t( name, this, options_str );
    return actions.bursting_ice;
  }
  if ( name == "freezing_torrent" )
    return new freezing_torrent_t( name, this, options_str );
  if ( name == "flight_of_the_navir" )
    return new flight_of_the_navir_t( name, this, options_str );
  if ( name == "ice_comet" )
    return new ice_comet_t( name, this, options_str );
  if ( name == "wrath_of_winter" )
    return new wrath_of_winter_t( name, this, options_str );
  if ( name == "ice_blitz" )
    return new ice_blitz_t( name, this, options_str );
  if ( name == "rising_talons" )
    return new rising_talons_t( name, this, options_str );
  if ( name == "talon_strike" )
    return new talon_strike_t( name, this, options_str );

  return fs_player_t::create_action( name, options_str );
}

void RimePlayer::init_background_actions()
{
  fs_player_t::init_background_actions();

  if ( !actions.bursting_ice_tick )
    actions.bursting_ice_tick = new actions::bursting_ice_tick_t( this );

  if ( !actions.bursting_ice )
    actions.bursting_ice = new actions::bursting_ice_t( "bursting_ice", this );

  actions.coalescing_frost = new actions::coalescing_frost_t( "coalescing_frost", this );
  actions.frost_swallow    = new actions::frost_swallow_t( this );
  actions.glacial_assault  = new spells::GlacialBlast::GlacialAssaultCleave( "glacial_assault", this );

  actions.ice_comet_avalanche =
      new actions::ice_comet_t( "ice_comet_avalanche", this, {}, secondary_trigger::AVALANCHE );
  actions.ice_comet_avalanche->background = true;
  actions.ice_comet_cold_shower =
      new actions::ice_comet_t( "ice_comet_cold_shower", this, {}, secondary_trigger::COLD_SHOWER );
  actions.ice_comet_cold_shower->background = true;

  actions.rising_talon_hit = new actions::rising_talons_t::rising_talons_hit_t( "rising_talons_hit", this );
  actions.talon_strike_hit = new actions::talon_strike_t::talon_strike_hit_t( "talon_strike_hit", this );
}
double RimePlayer::resource_gain( resource_e resource_type, double amount, gain_t* source, action_t* action )
{
  if ( resource_type == RESOURCE_ANIMA && talents_enabled( rime_t::CASCADING_BLITZ ) && buffs.ice_blitz->check() )
  {
    cascading_blitz_pending += static_cast<int>( amount );
    if ( !in_cascading_blitz )
    {
      in_cascading_blitz = true;
      while ( cascading_blitz_pending > 0 )
      {
        cascading_blitz_pending--;
        if ( target )
          actions.frost_swallow->set_target( target );
        actions.frost_swallow->execute();
      }
      in_cascading_blitz = false;
    }
  }

  double actual_amount = fs_player_t::resource_gain( resource_type, amount, source, action );

  if ( resource_type == RESOURCE_ANIMA )
  {
    while ( resources.current[ RESOURCE_ANIMA ] >= 9 )
    {
      resources.current[ RESOURCE_ANIMA ] -= 9;
      resource_gain( RESOURCE_WINTER_ORB, 1.0, gains.anima_worbs, action );
    }
  }

  if ( resource_type == RESOURCE_WINTER_ORB && source != gains.spirit_procs )
  {
    if ( target )
      actions.frost_swallow->set_target( target );
    for ( int i = 0; i < static_cast<int>( amount ) * 3; i++ )
    {
      actions.frost_swallow->execute();
    }

    // Overflowed
    if ( actual_amount < amount )
    {
      handle_wisdom_of_the_north( as<int>( amount - actual_amount ) );
    }

    if ( actual_amount > 0 && talents_enabled( rime_t::FROSTWEAVERS_WRATH ) && rngs.frostweavers_wrath->trigger() )
    {
      buffs.frostweavers_wrath->trigger();
    }
  }

  return actual_amount;
}

template <typename Base>
void actions::rime_action_t<Base>::trigger_spirit_refund( const action_state_t* state, double orbs_refunded )
{
  make_event( ab::sim, 200_ms, [ orbs_refunded, this ] {
    p()->resource_gain( RESOURCE_WINTER_ORB, orbs_refunded, p()->gains.spirit_procs, this );
    p()->sim->print_debug( "{} actually refunded {:.0f} Winter Orbs", *p(), orbs_refunded );
  } );

  p()->spirit_refund();
}

template <typename Base>
void actions::rime_action_t<Base>::spend_winter_orbs( const action_state_t* s )
{
  double orbs_spent = ab::last_resource_cost;

  if ( orbs_spent > 0 )
  {
    if ( p()->rng().roll( p()->cache.mastery_value() ) )
    {
      p()->sim->print_debug( "{} proc'd Spirit Orb Refund (Chance: {:.2f}%, Sprit: {:.2f}%)", *p(),
                             p()->cache.mastery_value() * 100.0, p()->cache.mastery() * 100.0 );

      trigger_spirit_refund( s, orbs_spent );
    }
    else if ( p()->buffs.undulating_spirit->check() )
    {
      p()->buffs.undulating_spirit->decrement();
      p()->sim->print_debug( "{} proc'd Undulating Spirit Refund", *p() );
      trigger_spirit_refund( s, orbs_spent );
    }
  }

  if ( orbs_spent > 0 )
  {
    p()->handle_wisdom_of_the_north( as<int>( orbs_spent ) );
  }
}


template <typename Base>
void actions::rime_action_t<Base>::gain_winter_orb( int gain )
{
}

template <typename Base>
void actions::rime_action_t<Base>::gain_anima( int gain )
{
}

class rime_module_t : public module_t
{
public:
  rime_module_t() : module_t( RIME )
  {
  }

  player_t* create_player( sim_t* sim, util::string_view name, race_e r = RACE_NONE ) const override
  {
    return new rime_t( sim, name, r );
  }

  bool valid() const override
  {
    return true;
  }

  void static_init() const override
  {
  }

  void register_hotfixes() const override
  {
  }

  void init( player_t* ) const override
  {
  }
  void combat_begin( sim_t* ) const override
  {
  }
  void combat_end( sim_t* ) const override
  {
  }
};

}  // namespace rime
}  // namespace fellowship

const module_t* module_t::rime()
{
  static fellowship::rime::rime_module_t m;
  return &m;
}