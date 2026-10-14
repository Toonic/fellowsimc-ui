#pragma once

#include "simulationcraft.hpp"
#include "rapidjson/document.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/prettywriter.h"
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <map>
#include <algorithm>
#include <cmath>
#include <limits>

namespace fellowship
{

struct replay_cast_entry_t
{
  int index = 0;
  timespan_t timestamp = timespan_t::zero();
  timespan_t end_timestamp = timespan_t::zero();
  std::string ability_name;
  std::string simc_action;
  int active_pack_count = 1;
  double target_hp_pct = 100.0;
  std::vector<double> pack_hp_pcts;
  double real_log_damage = 0.0;
  int real_log_hits = 0;
  int real_log_crits = 0;

  // Multi-iteration statistics
  double total_sim_dmg = 0.0;
  double sum_sq_sim_dmg = 0.0;
  double min_sim_dmg = std::numeric_limits<double>::max();
  double max_sim_dmg = 0.0;
  int64_t total_sim_hits = 0;
  int64_t total_sim_crits = 0;
  int iteration_count = 0;

  // Single iteration tracking
  double current_iter_dmg = 0.0;
  int current_iter_hits = 0;
  int current_iter_crits = 0;
};

class combat_replay_t;

struct replay_cast_event_t : public event_t
{
  combat_replay_t* replay;
  replay_cast_entry_t* entry;

  replay_cast_event_t( sim_t& s, timespan_t time, combat_replay_t* r, replay_cast_entry_t* e )
    : event_t( s, time ), replay( r ), entry( e )
  {
  }

  const char* name() const override
  {
    return "replay_cast";
  }

  void execute() override;
};

struct replay_resource_error_t
{
  int cast_index = 0;
  double timestamp = 0.0;
  std::string ability_name;
  std::string action_name;
  std::string resource_name;
  double cost_required = 0.0;
  double resource_available = 0.0;
  double anima_available = 0.0;
  std::string message;
};

class combat_replay_t
{
public:
  sim_t* sim = nullptr;
  std::string input_path;
  std::string output_path;
  std::vector<replay_cast_entry_t> timeline;
  std::map<std::string, replay_cast_entry_t*> active_actions;
  std::vector<replay_resource_error_t> resource_errors;
  bool is_active = false;
  int max_pack_count = 1;
  int swallow_bi_counter = 0;
  int current_channel_ticks = 0;
  replay_cast_entry_t* current_entry = nullptr;
  replay_cast_entry_t* active_channel_entry = nullptr;


  combat_replay_t( sim_t* s, const std::string& in_file, const std::string& out_file )
    : sim( s ), input_path( in_file ), output_path( out_file.empty() ? "exact_replay_results.json" : out_file )
  {
  }

  bool init()
  {
    if ( input_path.empty() )
      return false;

    std::ifstream file( input_path );
    if ( !file.is_open() )
    {
      sim->errorf( "combat_replay: Failed to open timeline file '{}'\n", input_path );
      return false;
    }

    std::stringstream ss;
    ss << file.rdbuf();
    std::string json_str = ss.str();
    file.close();

    rapidjson::Document doc;
    doc.Parse( json_str.c_str() );
    if ( doc.HasParseError() || !doc.HasMember( "timeline" ) || !doc[ "timeline" ].IsArray() )
    {
      sim->errorf( "combat_replay: Invalid JSON in timeline file '{}'\n", input_path );
      return false;
    }

    const auto& arr = doc[ "timeline" ];
    timeline.clear();
    max_pack_count = 1;

    for ( rapidjson::SizeType i = 0; i < arr.Size(); ++i )
    {
      const auto& item = arr[ i ];
      replay_cast_entry_t entry;

      entry.index = item.HasMember( "index" ) ? item[ "index" ].GetInt() : ( i + 1 );
      double ts = item.HasMember( "timestamp" ) ? item[ "timestamp" ].GetDouble() : 0.0;
      entry.timestamp = timespan_t::from_seconds( ts );

      double end_ts = item.HasMember( "end_timestamp" ) ? item[ "end_timestamp" ].GetDouble() : ts;
      entry.end_timestamp = timespan_t::from_seconds( end_ts );

      if ( item.HasMember( "ability_name" ) && item[ "ability_name" ].IsString() )
        entry.ability_name = item[ "ability_name" ].GetString();

      if ( item.HasMember( "simc_action" ) && item[ "simc_action" ].IsString() )
        entry.simc_action = item[ "simc_action" ].GetString();

      if ( item.HasMember( "active_pack_count" ) )
        entry.active_pack_count = item[ "active_pack_count" ].GetInt();

      if ( item.HasMember( "target_hp_pct" ) )
        entry.target_hp_pct = item[ "target_hp_pct" ].GetDouble();

      if ( item.HasMember( "real_log_damage" ) )
        entry.real_log_damage = item[ "real_log_damage" ].GetDouble();

      if ( item.HasMember( "real_log_hits" ) )
        entry.real_log_hits = item[ "real_log_hits" ].GetInt();

      if ( item.HasMember( "real_log_crits" ) )
        entry.real_log_crits = item[ "real_log_crits" ].GetInt();

      if ( item.HasMember( "full_log_damage" ) )
        entry.real_log_damage = item[ "full_log_damage" ].GetDouble();

      if ( item.HasMember( "active_pack" ) && item[ "active_pack" ].IsArray() )
      {
        const auto& p_arr = item[ "active_pack" ];
        for ( rapidjson::SizeType p_i = 0; p_i < p_arr.Size(); ++p_i )
        {
          if ( p_arr[ p_i ].HasMember( "hp_pct" ) )
          {
            entry.pack_hp_pcts.push_back( p_arr[ p_i ][ "hp_pct" ].GetDouble() );
          }
        }
      }

      if ( !entry.pack_hp_pcts.empty() )
      {
        max_pack_count = std::max( max_pack_count, (int)entry.pack_hp_pcts.size() );
      }
      else
      {
        max_pack_count = std::max( max_pack_count, entry.active_pack_count );
      }

      timeline.push_back( entry );
    }

    // Ensure sim creates enough target dummies to cover the pack size
    if ( sim->desired_targets < max_pack_count )
    {
      sim->desired_targets = max_pack_count;
    }

    // Ensure single threaded execution for replay consistency
    sim->threads = 1;

    if ( !timeline.empty() )
    {
      timespan_t fight_duration = timeline.back().end_timestamp + timespan_t::from_seconds( 5.0 );
      if ( sim->max_time < fight_duration )
      {
        sim->max_time = fight_duration;
      }
      sim->fixed_time = true;
      sim->vary_combat_length = 0.0;
    }

    is_active = !timeline.empty();
    fmt::print( "[COMBAT REPLAY] Loaded {} cast actions from '{}' (Max Pack Size: {} mobs)\n", timeline.size(), input_path, max_pack_count );
    return is_active;
  }

  replay_cast_entry_t* get_active_entry( const std::string& action_name )
  {
    if ( !is_active )
      return nullptr;
    auto it = active_actions.find( action_name );
    if ( it != active_actions.end() )
      return it->second;
    return nullptr;
  }

  action_t* find_replay_action( player_t* p, const std::string& name )
  {
    if ( !p || name.empty() )
      return nullptr;

    if ( name == "auto_attack" || name == "shoot" )
    {
      if ( p->main_hand_attack )
        return p->main_hand_attack;
      if ( action_t* a = p->find_action( "auto_attack_hit" ) )
        return a;
      if ( action_t* a = p->find_action( "auto_attack" ) )
        return a;
      if ( action_t* a = p->find_action( "shoot" ) )
        return a;
    }
    return p->find_action( name );
  }

  void combat_begin()
  {
    if ( !is_active )
      return;

    active_actions.clear();
    swallow_bi_counter = 0;

    player_t* p = sim->player_no_pet_list.empty() ? nullptr : sim->player_no_pet_list[ 0 ];
    if ( p && p->nth_iteration() == 0 )
    {
      for ( const auto& entry : timeline )
      {
        if ( !entry.simc_action.empty() && !find_replay_action( p, entry.simc_action ) )
        {
          action_t* a = p->create_action( entry.simc_action, "" );
          if ( a )
          {
            a->init();
            a->init_finished();
          }
        }
      }
    }

    for ( auto& entry : timeline )
    {
      entry.current_iter_dmg = 0.0;
      entry.current_iter_hits = 0;
      entry.current_iter_crits = 0;

      // Schedule replay cast event at exact timestamp
      make_event<replay_cast_event_t>( *sim, *sim, entry.timestamp, this, &entry );
    }
  }

  void register_action_tree( action_t* act, replay_cast_entry_t* entry )
  {
    if ( !act || !entry )
      return;

    active_actions[ act->name() ] = entry;

    std::string norm = act->name();
    std::transform( norm.begin(), norm.end(), norm.begin(), ::tolower );
    std::replace( norm.begin(), norm.end(), ' ', '_' );
    active_actions[ norm ] = entry;

    for ( auto* child : act->child_action )
    {
      register_action_tree( child, entry );
    }
  }

  void register_action( replay_cast_entry_t* entry )
  {
    if ( !entry || entry->simc_action.empty() )
      return;

    current_entry = entry;

    const std::string& act = entry->simc_action;
    active_actions[ act ] = entry;

    player_t* player = sim->player_no_pet_list.empty() ? nullptr : sim->player_no_pet_list[ 0 ];
    if ( player )
    {
      action_t* a = find_replay_action( player, act );
      if ( a )
      {
        register_action_tree( a, entry );
        if ( a->channeled )
        {
          active_channel_entry = entry;
          current_channel_ticks = 0;
        }
      }
    }
  }

  bool should_cancel_channel( action_t* action ) const
  {
    if ( !is_active || !action )
      return false;

    auto* entry = active_channel_entry ? active_channel_entry : current_entry;
    if ( !entry )
      return false;

    if ( action->name() != entry->simc_action )
      return false;

    if ( entry->real_log_hits > 0 && current_channel_ticks >= entry->real_log_hits )
    {
      return true;
    }
    return false;
  }

  int get_replay_hits_for_action( const action_t* action ) const
  {
    if ( !is_active || !current_entry )
      return 0;

    return current_entry->real_log_hits;
  }

  size_t filter_replay_targets( const action_t* action, std::vector<player_t*>& targetList )
  {
    if ( !is_active || !action )
      return targetList.size();

    auto* entry = active_channel_entry ? active_channel_entry : current_entry;
    if ( !entry )
      return targetList.size();

    int pack_limit = entry->pack_hp_pcts.empty() ? entry->active_pack_count : (int)entry->pack_hp_pcts.size();
    if ( pack_limit > 0 && (int)targetList.size() > pack_limit )
    {
      targetList.resize( pack_limit );
    }

    return targetList.size();
  }

  void record_damage( action_t* action, action_state_t* data )
  {
    if ( !is_active || !action || !data || data->result_total <= 0.0 )
      return;

    std::string aname = action->name();
    auto it = active_actions.find( aname );
    if ( it == active_actions.end() )
    {
      std::string norm = aname;
      std::transform( norm.begin(), norm.end(), norm.begin(), ::tolower );
      std::replace( norm.begin(), norm.end(), ' ', '_' );
      it = active_actions.find( norm );
    }

    replay_cast_entry_t* entry = ( it != active_actions.end() ) ? it->second : nullptr;
    if ( !entry && current_entry )
    {
      // Fallback: attribute to active current cast if triggered during its execution
      entry = current_entry;
    }

    if ( entry )
    {
      entry->current_iter_dmg += data->result_total;
      entry->current_iter_hits++;
      if ( data->result == RESULT_CRIT )
        entry->current_iter_crits++;
    }
  }

  void combat_end()
  {
    if ( !is_active )
      return;

    for ( auto& e : timeline )
    {
      e.total_sim_dmg += e.current_iter_dmg;
      e.sum_sq_sim_dmg += e.current_iter_dmg * e.current_iter_dmg;
      e.min_sim_dmg = std::min( e.min_sim_dmg, e.current_iter_dmg );
      e.max_sim_dmg = std::max( e.max_sim_dmg, e.current_iter_dmg );
      e.total_sim_hits += e.current_iter_hits;
      e.total_sim_crits += e.current_iter_crits;
      e.iteration_count++;
    }
  }

  void export_results()
  {
    if ( !is_active )
      return;

    rapidjson::Document doc;
    doc.SetObject();
    auto& allocator = doc.GetAllocator();

    rapidjson::Value arr( rapidjson::kArrayType );

    double total_log_dmg = 0.0;
    double total_sim_dmg = 0.0;

    for ( const auto& e : timeline )
    {
      double log_pkg = e.real_log_damage;
      total_log_dmg += log_pkg;

      double mean = ( e.iteration_count > 0 ) ? ( e.total_sim_dmg / e.iteration_count ) : 0.0;
      total_sim_dmg += mean;

      double variance = ( e.iteration_count > 1 ) ?
        std::max( 0.0, ( e.sum_sq_sim_dmg - ( e.total_sim_dmg * e.total_sim_dmg / e.iteration_count ) ) / ( e.iteration_count - 1 ) ) : 0.0;
      double stddev = std::sqrt( variance );

      double match_pct = ( log_pkg > 0.0 ) ? ( mean / log_pkg * 100.0 ) : ( ( mean == 0.0 ) ? 100.0 : 0.0 );
      double crit_pct = ( e.total_sim_hits > 0 ) ? ( (double)e.total_sim_crits / e.total_sim_hits * 100.0 ) : 0.0;

      rapidjson::Value obj( rapidjson::kObjectType );
      obj.AddMember( "index", e.index, allocator );
      obj.AddMember( "timestamp", e.timestamp.total_seconds(), allocator );
      obj.AddMember( "end_timestamp", e.end_timestamp.total_seconds(), allocator );
      obj.AddMember( "ability_name", rapidjson::Value( e.ability_name.c_str(), allocator ), allocator );
      obj.AddMember( "simc_action", rapidjson::Value( e.simc_action.c_str(), allocator ), allocator );
      obj.AddMember( "active_pack_count", e.active_pack_count, allocator );
      obj.AddMember( "target_hp_pct", e.target_hp_pct, allocator );
      obj.AddMember( "real_log_damage", e.real_log_damage, allocator );
      obj.AddMember( "real_log_hits", e.real_log_hits, allocator );
      obj.AddMember( "real_log_crits", e.real_log_crits, allocator );
      obj.AddMember( "sim_mean_damage", mean, allocator );
      obj.AddMember( "sim_stddev", stddev, allocator );
      obj.AddMember( "sim_min_damage", ( e.min_sim_dmg < 1e17 ) ? e.min_sim_dmg : 0.0, allocator );
      obj.AddMember( "sim_max_damage", e.max_sim_dmg, allocator );
      obj.AddMember( "sim_crit_pct", crit_pct, allocator );
      obj.AddMember( "match_pct", match_pct, allocator );

      arr.PushBack( obj, allocator );
    }

    doc.AddMember( "total_log_damage", total_log_dmg, allocator );
    doc.AddMember( "total_sim_damage", total_sim_dmg, allocator );
    double overall_match = ( total_log_dmg > 0.0 ) ? ( total_sim_dmg / total_log_dmg * 100.0 ) : 100.0;
    doc.AddMember( "overall_match_pct", overall_match, allocator );
    doc.AddMember( "results", arr, allocator );

    rapidjson::Value err_arr( rapidjson::kArrayType );
    for ( const auto& err : resource_errors )
    {
      rapidjson::Value err_obj( rapidjson::kObjectType );
      err_obj.AddMember( "cast_index", err.cast_index, allocator );
      err_obj.AddMember( "timestamp", err.timestamp, allocator );
      err_obj.AddMember( "ability_name", rapidjson::Value( err.ability_name.c_str(), allocator ), allocator );
      err_obj.AddMember( "action_name", rapidjson::Value( err.action_name.c_str(), allocator ), allocator );
      err_obj.AddMember( "resource_name", rapidjson::Value( err.resource_name.c_str(), allocator ), allocator );
      err_obj.AddMember( "cost_required", err.cost_required, allocator );
      err_obj.AddMember( "resource_available", err.resource_available, allocator );
      err_obj.AddMember( "anima_available", err.anima_available, allocator );
      err_obj.AddMember( "message", rapidjson::Value( err.message.c_str(), allocator ), allocator );
      err_arr.PushBack( err_obj, allocator );
    }
    doc.AddMember( "resource_errors", err_arr, allocator );
    doc.AddMember( "resource_error_count", (int)resource_errors.size(), allocator );

    rapidjson::StringBuffer buffer;
    rapidjson::PrettyWriter<rapidjson::StringBuffer> writer( buffer );
    doc.Accept( writer );

    std::ofstream out( output_path );
    if ( out.is_open() )
    {
      out << buffer.GetString();
      out.close();
      fmt::print( "\n================================================================================\n" );
      fmt::print( "[COMBAT REPLAY] Results successfully exported to '{}'\n", output_path );
      fmt::print( "Total Log Damage: {:.0f} | Sim Mean: {:.0f} | Overall Match: {:.1f}%\n", total_log_dmg, total_sim_dmg, overall_match );
      fmt::print( "================================================================================\n" );
    }
  }
};

inline void replay_cast_event_t::execute()
{
  if ( !replay || !entry || !replay->sim )
    return;

  sim_t* s = replay->sim;

  // 1. Update target list pack size and target health dynamically
  int alive_mobs = entry->pack_hp_pcts.empty() ? std::max( 1, entry->active_pack_count ) : (int)entry->pack_hp_pcts.size();
  for ( size_t i = 0; i < s->target_list.size(); ++i )
  {
    player_t* enemy = s->target_list[ i ];
    if ( (int)i < alive_mobs )
    {
      if ( enemy->is_sleeping() )
      {
        enemy->arise();
      }
      double max_hp = 1000000000.0;
      enemy->resources.max[ RESOURCE_HEALTH ] = max_hp;
      double hp_pct = i < entry->pack_hp_pcts.size() ? entry->pack_hp_pcts[ i ] : entry->target_hp_pct;
      hp_pct = std::max( 0.1, hp_pct );
      enemy->resources.current[ RESOURCE_HEALTH ] = max_hp * ( hp_pct / 100.0 );
    }
    else
    {
      if ( !enemy->is_sleeping() )
      {
        enemy->demise();
      }
    }
  }

  // 2. Set primary target
  player_t* player = s->player_no_pet_list.empty() ? nullptr : s->player_no_pet_list[ 0 ];
  if ( !player )
    return;

  if ( !s->target_list.empty() )
  {
    player->target = s->target_list[ 0 ];
  }

  // 3. Clear GCD and current casting state so the action executes cleanly at its authentic timestamp
  player->gcd_ready = timespan_t::zero();
  player->executing = nullptr;
  if ( player->channeling )
  {
    // Auto-attack (Shoot) executes in parallel during authentic gameplay and must NOT cancel an active channel (e.g. Heartseeker Barrage)
    if ( entry->simc_action != "auto_attack" )
    {
      player->channeling->cancel();
      replay->active_channel_entry = nullptr;
    }
  }

  // 4. Register active action for damage attribution
  replay->register_action( entry );
  replay->current_entry = entry;

  // 6. Execute action on player

  if ( !entry->simc_action.empty() )
  {
    action_t* a = replay->find_replay_action( player, entry->simc_action );
    if ( !a && player->nth_iteration() == 0 )
    {
      a = player->create_action( entry->simc_action, "" );
      if ( a )
      {
        a->init();
        a->init_finished();
      }
    }

    if ( a )
    {
      double cost_needed = a->cost();
      resource_e res_type = a->current_resource();
      if ( res_type != RESOURCE_NONE && cost_needed > 0.0 )
      {
        double available = player->resources.current[ res_type ];
        if ( available < cost_needed )
        {
          replay_resource_error_t err;
          err.cast_index = entry->index;
          err.timestamp = entry->timestamp.total_seconds();
          err.ability_name = entry->ability_name;
          err.action_name = entry->simc_action;
          err.resource_name = util::resource_type_string( res_type );
          err.cost_required = cost_needed;
          err.resource_available = available;
          err.anima_available = player->resources.current[ RESOURCE_ANIMA ];
          err.message = fmt::format( "Cast #{} at {:.2f}s: '{}' requires {:.1f} {}, but player only has {:.1f} (Anima: {:.1f})",
                                     entry->index, entry->timestamp.total_seconds(), entry->ability_name, cost_needed,
                                     util::resource_type_string( res_type ), available, player->resources.current[ RESOURCE_ANIMA ] );
          replay->resource_errors.push_back( err );
          fmt::print( stderr, "[REPLAY RESOURCE ERROR] {}\n", err.message );

          // In replay mode, grant the resource deficit so the authentic log cast executes cleanly
          player->resources.current[ res_type ] = cost_needed;
        }
      }


      if ( a->cooldown )
      {
        a->cooldown->reset( false, -1 );
      }
      if ( player->target )
      {
        a->set_target( player->target );
      }
      if ( !a->channeled )
      {
        a->base_execute_time = timespan_t::zero();
      }
      a->target_cache.is_valid = false;
      a->execute();
    }
  }
}

} // namespace fellowship
