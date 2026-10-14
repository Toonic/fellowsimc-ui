#pragma once

#include "class_modules/fs_player.hpp"
#include "class_modules/rime/RimePlayer.hpp"
#include "util/util.hpp"

namespace fellowship::rime
{
  namespace actions
  {
    struct rime_spell_t;
  }

  namespace spells
  {
    using namespace ::fellowship::rime::actions;
    using rime_t            = ::fellowship::rime::rime_t;
    using RimePlayer        = ::fellowship::rime::RimePlayer;
    using secondary_trigger = ::fellowship::rime::secondary_trigger;
  }

  /// <summary>
  /// Secondary triggers that can be triggered by spells (e.g. Avalanche, Cold Shower).
  /// </summary>
  enum class SecondaryTriggerType : uint32_t
  {
    None = 0,
    Avalanche,
    ColdShower
  };

  template <typename TBaseAction>
  struct RimeActionState : public action_state_t
  {
    using base_t = action_state_t;

    double TargetDamageAmplification = 1.0;
    bool   GlacialAssaultMaxStacks   = false;

    RimeActionState( TBaseAction* action, player_t* target )
      : base_t( action, target )
    {
    }

    void initialize() override
    {
      base_t::initialize();
      TargetDamageAmplification = 1.0;
      GlacialAssaultMaxStacks   = false;
    }

    void copy_state( const action_state_t* other ) override
    {
      base_t::copy_state( other );
      const auto* rimeState = debug_cast<const RimeActionState<TBaseAction>*>( other );
      TargetDamageAmplification = rimeState->TargetDamageAmplification;
      GlacialAssaultMaxStacks   = rimeState->GlacialAssaultMaxStacks;
    }
  };

  /// <summary>
  /// Base templated action class for all Rime actions, spells, and attacks.
  /// Provides direct typed access to RimePlayer and RimeTargetData without abbreviations.
  /// </summary>
  template <typename TBaseAction>
  class RimeAction : public TBaseAction
  {
  public:
    using Base = TBaseAction;
    using Self = RimeAction<TBaseAction>;

    SecondaryTriggerType SecondaryTrigger = SecondaryTriggerType::None;

    RimeAction( util::string_view actionName, player_t* player, util::string_view options = {} )
      : Base( actionName, debug_cast<fellowship::fs_player_t*>( player ), options ), SecondaryTrigger( SecondaryTriggerType::None )
    {
      Base::parse_options( options );
      Base::may_crit = Base::tick_may_crit = true;
      Base::set_school( SCHOOL_FROST );
      Base::gcd_type = gcd_haste_type::SPELL_HASTE;
    }

    void init() override
    {
      Base::init();
    }

    /// <summary>
    /// Gets the typed RimePlayer owning this action.
    /// </summary>
    RimePlayer* GetPlayer()
    {
      return debug_cast<RimePlayer*>( Base::player );
    }

    const RimePlayer* GetPlayer() const
    {
      return debug_cast<const RimePlayer*>( Base::player );
    }

    RimeTargetData* GetTargetData( player_t* target ) const
    {
      return const_cast<RimePlayer*>( GetPlayer() )->GetTargetData( target );
    }

    // Legacy shorthand aliases for compatibility
    RimePlayer* p() { return GetPlayer(); }
    const RimePlayer* p() const { return GetPlayer(); }
    RimeTargetData* td( player_t* target ) const { return GetTargetData( target ); }

    bool IsSecondaryAction() const noexcept
    {
      return SecondaryTrigger != SecondaryTriggerType::None;
    }

    action_state_t* new_state() override
    {
      return new RimeActionState<Self>( this, Base::target );
    }

    void update_state( action_state_t* state, unsigned flags, result_amount_type rt ) override
    {
      Base::update_state( state, flags, rt );
    }

    void snapshot_state( action_state_t* state, result_amount_type rt ) override
    {
      Base::snapshot_state( state, rt );
    }

    virtual double GenerateAnima() const
    {
      if ( Base::energize_type != action_energize::NONE && Base::energize_resource == RESOURCE_ANIMA )
      {
        return Base::energize_amount;
      }
      return 0.0;
    }

    void consume_resource() override
    {
      if ( IsSecondaryAction() )
        return;

      auto currentRes = Base::current_resource();
      Base::consume_resource();

      if ( currentRes == RESOURCE_WINTER_ORB )
      {
        OnWinterOrbsConsumed();
      }
    }

    virtual void OnWinterOrbsConsumed();
  };

  /// <summary>
  /// Base class for all active Rime spells.
  /// </summary>
  using RimeSpellBase = RimeAction<fellowship::actions::fs_player_action_t<spell_t>>;

  class RimeSpell : public RimeSpellBase
  {
  public:
    RimeSpell( util::string_view spellName, player_t* player, util::string_view options = {} )
      : RimeSpellBase( spellName, player, options )
    {
    }
  };

  /// <summary>
  /// Base class for all Rime heal / self-buff actions.
  /// </summary>
  using RimeHealBase = RimeAction<fellowship::actions::fs_player_action_t<heal_t>>;

  class RimeHeal : public RimeHealBase
  {
  public:
    RimeHeal( util::string_view healName, player_t* player, util::string_view options = {} )
      : RimeHealBase( healName, player, options )
    {
      harmful = false;
      set_target( player );
    }
  };
}

