import { VFLManager } from '../VFLManager';
import { MaddenTheme, Trade, Commissioner } from '../themes/MaddenTheme';
import { MaddenGame, Player, Team } from '../../export/madden_league_types';
import { TeamList } from '../../db/madden_db';
import MaddenDB from '../../db/madden_db';
import EventDB, { SnallabotEvent } from '../../db/events_db';
import db from '../../db/firebase';
import { LeagueSettings } from '../../discord/settings_db';

export interface VFLLeagueSettings extends LeagueSettings {
  vfl_channels?: {
    trades?: string;
    commissioners?: string;
    game_results?: string;
    rating_changes?: string;
    waiver_claims?: string;
    roster_moves?: string;
    announcements?: string;
  };
  vfl_notifications?: {
    [key: string]: boolean;
  };
  trade_settings?: {
    require_approval: boolean;
    auto_approve_after_hours: number;
    allowed_commissioners: string[];
  };
}

export interface RatingChangeEvent {
  playerId: number;
  playerName: string;
  position: string;
  teamId: number;
  oldRating: number;
  newRating: number;
  changeType: 'increase' | 'decrease';
  leagueId: string;
}

export interface WaiverClaimEvent {
  playerId: number;
  playerName: string;
  position: string;
  claimingTeamId: number;
  priority: number;
  leagueId: string;
}

export interface RosterMoveEvent {
  playerId: number;
  playerName: string;
  position: string;
  fromTeamId: number;
  toTeamId: number;
  moveType: 'trade' | 'waiver' | 'free_agent' | 'release';
  leagueId: string;
}

export class ChannelManager {
  private client: VFLManager;
  private theme: MaddenTheme;

  constructor(client: VFLManager) {
    this.client = client;
    this.theme = new MaddenTheme();
  }

  async initialize() {
    console.log('🔧 Initializing Channel Manager...');
    // Any initialization logic here
  }

  // EA Data Event Handlers (Preserve existing logic)
  async handleGameUpdate(games: SnallabotEvent<MaddenGame>[]) {
    console.log(`🏈 Processing ${games.length} game updates`);
    
    for (const gameEvent of games) {
      const game = gameEvent as MaddenGame & SnallabotEvent<MaddenGame>;
      
      // Only process completed games
      if (game.status !== 1) { // NOT_PLAYED = 1
        await this.postGameResult(game);
      }
    }
  }

  async handlePlayerUpdate(players: SnallabotEvent<Player>[]) {
    console.log(`👤 Processing ${players.length} player updates`);
    
    for (const playerEvent of players) {
      const player = playerEvent as Player & SnallabotEvent<Player>;
      await this.checkForRatingChanges(player);
      await this.checkForRosterMoves(player);
    }
  }

  async handleTeamUpdate(teams: SnallabotEvent<Team>[]) {
    console.log(`🏟️ Processing ${teams.length} team updates`);
    // Handle team updates if needed
  }

  // VFL Manager Event Handlers
  async handleTradeProposed(trades: SnallabotEvent<Trade>[]) {
    console.log(`🔄 Processing ${trades.length} trade proposals`);
    
    for (const tradeEvent of trades) {
      const trade = tradeEvent as Trade & SnallabotEvent<Trade>;
      await this.postTradeNotification(trade, 'proposed');
    }
  }

  async handleTradeCompleted(trades: SnallabotEvent<Trade>[]) {
    console.log(`✅ Processing ${trades.length} completed trades`);
    
    for (const tradeEvent of trades) {
      const trade = tradeEvent as Trade & SnallabotEvent<Trade>;
      await this.postTradeNotification(trade, 'completed');
    }
  }

  async handleCommissionerUpdate(commissioners: SnallabotEvent<Commissioner>[]) {
    console.log(`👑 Processing ${commissioners.length} commissioner updates`);
    
    for (const commissionerEvent of commissioners) {
      const commissioner = commissionerEvent as Commissioner & SnallabotEvent<Commissioner>;
      await this.postCommissionerUpdate(commissioner);
    }
  }

  async handleRatingChange(ratingChanges: SnallabotEvent<RatingChangeEvent>[]) {
    console.log(`📊 Processing ${ratingChanges.length} rating changes`);
    
    for (const ratingChangeEvent of ratingChanges) {
      const ratingChange = ratingChangeEvent as RatingChangeEvent & SnallabotEvent<RatingChangeEvent>;
      await this.postRatingChange(ratingChange);
    }
  }

  async handleWaiverClaim(waiverClaims: SnallabotEvent<WaiverClaimEvent>[]) {
    console.log(`🎯 Processing ${waiverClaims.length} waiver claims`);
    
    for (const waiverClaimEvent of waiverClaims) {
      const waiverClaim = waiverClaimEvent as WaiverClaimEvent & SnallabotEvent<WaiverClaimEvent>;
      await this.postWaiverClaim(waiverClaim);
    }
  }

  async handleRosterMove(rosterMoves: SnallabotEvent<RosterMoveEvent>[]) {
    console.log(`📋 Processing ${rosterMoves.length} roster moves`);
    
    for (const rosterMoveEvent of rosterMoves) {
      const rosterMove = rosterMoveEvent as RosterMoveEvent & SnallabotEvent<RosterMoveEvent>;
      await this.postRosterMove(rosterMove);
    }
  }

  // Posting Methods
  private async postGameResult(game: MaddenGame) {
    try {
      const guilds = await this.getGuildsForLeague(game.key);
      const teams = await MaddenDB.getLatestTeams(game.key);
      
      for (const guild of guilds) {
        const settings = await this.getVFLLeagueSettings(guild.id);
        
        if (settings.vfl_channels?.game_results && settings.vfl_notifications?.game_results !== false) {
          const channel = await this.client.channels.fetch(settings.vfl_channels.game_results);
          
          if (channel?.isTextBased()) {
            const embed = this.theme.createGameResultEmbed(game, teams);
            const refreshButton = this.theme.createRefreshButton('standings');
            
            await channel.send({ 
              embeds: [embed], 
              components: [refreshButton] 
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error posting game result:', error);
    }
  }

  private async postTradeNotification(trade: Trade, action: string) {
    try {
      const guilds = await this.getGuildsForLeague(trade.leagueId);
      
      for (const guild of guilds) {
        const settings = await this.getVFLLeagueSettings(guild.id);
        
        if (settings.vfl_channels?.trades && settings.vfl_notifications?.trades !== false) {
          const channel = await this.client.channels.fetch(settings.vfl_channels.trades);
          
          if (channel?.isTextBased()) {
            const embed = this.theme.createTradeEmbed(trade);
            const components = [];
            
            if (trade.status === 'pending') {
              components.push(this.theme.createTradeActionButtons(trade));
            }
            
            components.push(this.theme.createRefreshButton('trades'));
            
            await channel.send({ 
              embeds: [embed], 
              components 
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error posting trade notification:', error);
    }
  }

  private async postCommissionerUpdate(commissioner: Commissioner) {
    try {
      const guilds = await this.getGuildsForLeague(commissioner.leagueId);
      
      for (const guild of guilds) {
        const settings = await this.getVFLLeagueSettings(guild.id);
        
        if (settings.vfl_channels?.commissioners) {
          const channel = await this.client.channels.fetch(settings.vfl_channels.commissioners);
          
          if (channel?.isTextBased()) {
            const allCommissioners = await this.getCommissionersForLeague(commissioner.leagueId);
            const embed = this.theme.createCommissionerEmbed(allCommissioners);
            
            await channel.send({ embeds: [embed] });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error posting commissioner update:', error);
    }
  }

  private async postRatingChange(ratingChange: RatingChangeEvent) {
    try {
      const guilds = await this.getGuildsForLeague(ratingChange.leagueId);
      
      for (const guild of guilds) {
        const settings = await this.getVFLLeagueSettings(guild.id);
        
        if (settings.vfl_channels?.rating_changes && settings.vfl_notifications?.rating_changes !== false) {
          const channel = await this.client.channels.fetch(settings.vfl_channels.rating_changes);
          
          if (channel?.isTextBased()) {
            const player = await MaddenDB.getPlayer(ratingChange.leagueId, ratingChange.playerId.toString());
            const embed = this.theme.createRatingChangeEmbed(player, ratingChange.oldRating, ratingChange.newRating);
            
            await channel.send({ embeds: [embed] });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error posting rating change:', error);
    }
  }

  private async postWaiverClaim(waiverClaim: WaiverClaimEvent) {
    try {
      const guilds = await this.getGuildsForLeague(waiverClaim.leagueId);
      
      for (const guild of guilds) {
        const settings = await this.getVFLLeagueSettings(guild.id);
        
        if (settings.vfl_channels?.waiver_claims && settings.vfl_notifications?.waiver_claims !== false) {
          const channel = await this.client.channels.fetch(settings.vfl_channels.waiver_claims);
          
          if (channel?.isTextBased()) {
            const player = await MaddenDB.getPlayer(waiverClaim.leagueId, waiverClaim.playerId.toString());
            const teams = await MaddenDB.getLatestTeams(waiverClaim.leagueId);
            const claimingTeam = teams.getTeamForId(waiverClaim.claimingTeamId);
            
            const embed = this.theme.createWaiverClaimEmbed(player, claimingTeam, waiverClaim.priority);
            
            await channel.send({ embeds: [embed] });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error posting waiver claim:', error);
    }
  }

  private async postRosterMove(rosterMove: RosterMoveEvent) {
    try {
      const guilds = await this.getGuildsForLeague(rosterMove.leagueId);
      
      for (const guild of guilds) {
        const settings = await this.getVFLLeagueSettings(guild.id);
        
        if (settings.vfl_channels?.roster_moves && settings.vfl_notifications?.roster_moves !== false) {
          const channel = await this.client.channels.fetch(settings.vfl_channels.roster_moves);
          
          if (channel?.isTextBased()) {
            const player = await MaddenDB.getPlayer(rosterMove.leagueId, rosterMove.playerId.toString());
            const teams = await MaddenDB.getLatestTeams(rosterMove.leagueId);
            
            let description = '';
            if (rosterMove.fromTeamId === 0) {
              description = `**${player.firstName} ${player.lastName}** signed by **${teams.getTeamForId(rosterMove.toTeamId).displayName}**`;
            } else if (rosterMove.toTeamId === 0) {
              description = `**${player.firstName} ${player.lastName}** released by **${teams.getTeamForId(rosterMove.fromTeamId).displayName}**`;
            } else {
              description = `**${player.firstName} ${player.lastName}** moved from **${teams.getTeamForId(rosterMove.fromTeamId).displayName}** to **${teams.getTeamForId(rosterMove.toTeamId).displayName}**`;
            }
            
            const embed = this.theme.createInfoEmbed('Roster Move', description);
            
            await channel.send({ embeds: [embed] });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error posting roster move:', error);
    }
  }

  // Helper Methods
  private async getGuildsForLeague(leagueId: string): Promise<{ id: string }[]> {
    try {
      const querySnapshot = await db.collection("league_settings")
        .where("commands.madden_league.league_id", "==", leagueId)
        .get();
      
      return querySnapshot.docs.map(doc => ({ id: doc.id }));
    } catch (error) {
      console.error('❌ Error getting guilds for league:', error);
      return [];
    }
  }

  private async getVFLLeagueSettings(guildId: string): Promise<VFLLeagueSettings> {
    try {
      const doc = await db.collection("league_settings").doc(guildId).get();
      return doc.exists ? doc.data() as VFLLeagueSettings : {} as VFLLeagueSettings;
    } catch (error) {
      console.error('❌ Error getting VFL league settings:', error);
      return {} as VFLLeagueSettings;
    }
  }

  private async getCommissionersForLeague(leagueId: string): Promise<Commissioner[]> {
    try {
      const querySnapshot = await db.collection("commissioners")
        .where("leagueId", "==", leagueId)
        .get();
      
      return querySnapshot.docs.map(doc => doc.data() as Commissioner);
    } catch (error) {
      console.error('❌ Error getting commissioners:', error);
      return [];
    }
  }

  private async checkForRatingChanges(player: Player) {
    // Implementation to detect rating changes
    // This would compare current player data with previous data
    // and emit rating change events when detected
  }

  private async checkForRosterMoves(player: Player) {
    // Implementation to detect roster moves
    // This would compare current player team with previous team
    // and emit roster move events when detected
  }
}