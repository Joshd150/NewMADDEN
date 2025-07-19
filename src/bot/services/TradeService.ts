import { randomUUID } from 'crypto';
import db from '../../db/firebase';
import EventDB, { EventDelivery, SnallabotEvent } from '../../db/events_db';
import { Trade, TradeAsset, Commissioner } from '../themes/MaddenTheme';

export interface TradeResult {
  success: boolean;
  error?: string;
  trade?: Trade;
}

export class TradeService {
  async proposeTrade(
    leagueId: string,
    fromTeamId: number,
    toTeamId: number,
    fromAssets: TradeAsset[],
    toAssets: TradeAsset[],
    proposedBy: string,
    notes?: string
  ): Promise<TradeResult> {
    try {
      const trade: Trade = {
        id: randomUUID(),
        leagueId,
        fromTeamId,
        toTeamId,
        fromAssets,
        toAssets,
        status: 'pending',
        proposedBy,
        proposedAt: new Date(),
        notes
      };

      // Save trade to database
      await db.collection('trades').doc(trade.id).set(trade);

      // Emit trade proposed event
      await EventDB.appendEvents<Trade>([{
        key: leagueId,
        event_type: 'TRADE_PROPOSED',
        ...trade
      }], EventDelivery.EVENT_SOURCE);

      return { success: true, trade };
    } catch (error) {
      console.error('❌ Error proposing trade:', error);
      return { success: false, error: 'Failed to propose trade' };
    }
  }

  async approveTrade(tradeId: string, reviewedBy: string): Promise<TradeResult> {
    try {
      const tradeDoc = await db.collection('trades').doc(tradeId).get();
      
      if (!tradeDoc.exists) {
        return { success: false, error: 'Trade not found' };
      }

      const trade = tradeDoc.data() as Trade;
      
      if (trade.status !== 'pending') {
        return { success: false, error: 'Trade is not pending approval' };
      }

      const updatedTrade: Trade = {
        ...trade,
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date()
      };

      await db.collection('trades').doc(tradeId).update({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date()
      });

      // Emit trade approved event
      await EventDB.appendEvents<Trade>([{
        key: trade.leagueId,
        event_type: 'TRADE_APPROVED',
        ...updatedTrade
      }], EventDelivery.EVENT_SOURCE);

      return { success: true, trade: updatedTrade };
    } catch (error) {
      console.error('❌ Error approving trade:', error);
      return { success: false, error: 'Failed to approve trade' };
    }
  }

  async rejectTrade(tradeId: string, reviewedBy: string, reason: string): Promise<TradeResult> {
    try {
      const tradeDoc = await db.collection('trades').doc(tradeId).get();
      
      if (!tradeDoc.exists) {
        return { success: false, error: 'Trade not found' };
      }

      const trade = tradeDoc.data() as Trade;
      
      if (trade.status !== 'pending') {
        return { success: false, error: 'Trade is not pending approval' };
      }

      const updatedTrade: Trade = {
        ...trade,
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        notes: trade.notes ? `${trade.notes}\n\nRejection Reason: ${reason}` : `Rejection Reason: ${reason}`
      };

      await db.collection('trades').doc(tradeId).update({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        notes: updatedTrade.notes
      });

      // Emit trade rejected event
      await EventDB.appendEvents<Trade>([{
        key: trade.leagueId,
        event_type: 'TRADE_REJECTED',
        ...updatedTrade
      }], EventDelivery.EVENT_SOURCE);

      return { success: true, trade: updatedTrade };
    } catch (error) {
      console.error('❌ Error rejecting trade:', error);
      return { success: false, error: 'Failed to reject trade' };
    }
  }

  async completeTrade(tradeId: string): Promise<TradeResult> {
    try {
      const tradeDoc = await db.collection('trades').doc(tradeId).get();
      
      if (!tradeDoc.exists) {
        return { success: false, error: 'Trade not found' };
      }

      const trade = tradeDoc.data() as Trade;
      
      if (trade.status !== 'approved') {
        return { success: false, error: 'Trade must be approved before completion' };
      }

      const updatedTrade: Trade = {
        ...trade,
        status: 'completed',
        completedAt: new Date()
      };

      await db.collection('trades').doc(tradeId).update({
        status: 'completed',
        completedAt: new Date()
      });

      // Emit trade completed event
      await EventDB.appendEvents<Trade>([{
        key: trade.leagueId,
        event_type: 'TRADE_COMPLETED',
        ...updatedTrade
      }], EventDelivery.EVENT_SOURCE);

      return { success: true, trade: updatedTrade };
    } catch (error) {
      console.error('❌ Error completing trade:', error);
      return { success: false, error: 'Failed to complete trade' };
    }
  }

  async getTradeById(tradeId: string): Promise<Trade | null> {
    try {
      const tradeDoc = await db.collection('trades').doc(tradeId).get();
      return tradeDoc.exists ? tradeDoc.data() as Trade : null;
    } catch (error) {
      console.error('❌ Error getting trade by ID:', error);
      return null;
    }
  }

  async getTradesByStatus(guildId: string, status: Trade['status']): Promise<Trade[]> {
    try {
      // First get the league ID for this guild
      const leagueId = await this.getLeagueIdForGuild(guildId);
      if (!leagueId) return [];

      const tradesSnapshot = await db.collection('trades')
        .where('leagueId', '==', leagueId)
        .where('status', '==', status)
        .orderBy('proposedAt', 'desc')
        .limit(50)
        .get();

      return tradesSnapshot.docs.map(doc => doc.data() as Trade);
    } catch (error) {
      console.error('❌ Error getting trades by status:', error);
      return [];
    }
  }

  async getPendingTrades(guildId: string): Promise<Trade[]> {
    return this.getTradesByStatus(guildId, 'pending');
  }

  async getTradesForUser(guildId: string, userId: string): Promise<Trade[]> {
    try {
      const leagueId = await this.getLeagueIdForGuild(guildId);
      if (!leagueId) return [];

      const tradesSnapshot = await db.collection('trades')
        .where('leagueId', '==', leagueId)
        .where('proposedBy', '==', userId)
        .orderBy('proposedAt', 'desc')
        .limit(50)
        .get();

      return tradesSnapshot.docs.map(doc => doc.data() as Trade);
    } catch (error) {
      console.error('❌ Error getting trades for user:', error);
      return [];
    }
  }

  async getTradesForTeam(guildId: string, teamId: string): Promise<Trade[]> {
    try {
      const leagueId = await this.getLeagueIdForGuild(guildId);
      if (!leagueId) return [];

      const teamIdNum = parseInt(teamId);
      
      const [fromTradesSnapshot, toTradesSnapshot] = await Promise.all([
        db.collection('trades')
          .where('leagueId', '==', leagueId)
          .where('fromTeamId', '==', teamIdNum)
          .orderBy('proposedAt', 'desc')
          .limit(25)
          .get(),
        db.collection('trades')
          .where('leagueId', '==', leagueId)
          .where('toTeamId', '==', teamIdNum)
          .orderBy('proposedAt', 'desc')
          .limit(25)
          .get()
      ]);

      const fromTrades = fromTradesSnapshot.docs.map(doc => doc.data() as Trade);
      const toTrades = toTradesSnapshot.docs.map(doc => doc.data() as Trade);
      
      // Combine and deduplicate
      const allTrades = [...fromTrades, ...toTrades];
      const uniqueTrades = allTrades.filter((trade, index, self) => 
        index === self.findIndex(t => t.id === trade.id)
      );
      
      // Sort by date
      return uniqueTrades.sort((a, b) => b.proposedAt.getTime() - a.proposedAt.getTime());
    } catch (error) {
      console.error('❌ Error getting trades for team:', error);
      return [];
    }
  }

  async getAllTrades(guildId: string): Promise<Trade[]> {
    try {
      const leagueId = await this.getLeagueIdForGuild(guildId);
      if (!leagueId) return [];

      const tradesSnapshot = await db.collection('trades')
        .where('leagueId', '==', leagueId)
        .orderBy('proposedAt', 'desc')
        .limit(100)
        .get();

      return tradesSnapshot.docs.map(doc => doc.data() as Trade);
    } catch (error) {
      console.error('❌ Error getting all trades:', error);
      return [];
    }
  }

  async isUserCommissioner(guildId: string, userId: string): Promise<boolean> {
    try {
      const leagueId = await this.getLeagueIdForGuild(guildId);
      if (!leagueId) return false;

      const commissionerSnapshot = await db.collection('commissioners')
        .where('leagueId', '==', leagueId)
        .where('discordUserId', '==', userId)
        .get();

      return !commissionerSnapshot.empty;
    } catch (error) {
      console.error('❌ Error checking commissioner status:', error);
      return false;
    }
  }

  async parseTradeAssets(assetsText: string): Promise<TradeAsset[]> {
    const assets: TradeAsset[] = [];
    const lines = assetsText.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().startsWith('player:')) {
        const playerName = trimmedLine.substring(7).trim();
        assets.push({
          type: 'player',
          playerName
        });
      } else if (trimmedLine.toLowerCase().startsWith('pick:')) {
        const pickInfo = trimmedLine.substring(5).trim();
        const pickMatch = pickInfo.match(/(\d{4})\s+round\s+(\d+)/i);
        
        if (pickMatch) {
          assets.push({
            type: 'pick',
            pickYear: parseInt(pickMatch[1]),
            pickRound: parseInt(pickMatch[2])
          });
        }
      } else if (trimmedLine.toLowerCase().startsWith('cash:')) {
        const cashText = trimmedLine.substring(5).trim();
        const cashAmount = parseInt(cashText.replace(/[,$]/g, ''));
        
        if (!isNaN(cashAmount)) {
          assets.push({
            type: 'cash',
            cashAmount
          });
        }
      }
    }

    return assets;
  }

  async handleButtonInteraction(interaction: any, params: string[]) {
    const [action, tradeId] = params;
    const userId = interaction.user.id;

    try {
      switch (action) {
        case 'approve':
          await this.handleApproveButton(interaction, tradeId, userId);
          break;
        case 'reject':
          await this.handleRejectButton(interaction, tradeId, userId);
          break;
        case 'details':
          await this.handleDetailsButton(interaction, tradeId);
          break;
        default:
          await interaction.reply({
            content: 'Unknown trade action.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('❌ Error handling trade button interaction:', error);
      await interaction.reply({
        content: 'An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }

  async handleModalSubmit(interaction: any, params: string[]) {
    const [action, toUserId] = params;

    if (action === 'propose') {
      await this.handleTradeProposalModal(interaction, toUserId);
    }
  }

  private async handleApproveButton(interaction: any, tradeId: string, userId: string) {
    const isCommissioner = await this.isUserCommissioner(interaction.guildId, userId);
    
    if (!isCommissioner) {
      await interaction.reply({
        content: 'Only commissioners can approve trades.',
        ephemeral: true
      });
      return;
    }

    const result = await this.approveTrade(tradeId, userId);
    
    if (result.success) {
      await interaction.reply({
        content: `✅ Trade ${tradeId.slice(-6)} has been approved.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Failed to approve trade: ${result.error}`,
        ephemeral: true
      });
    }
  }

  private async handleRejectButton(interaction: any, tradeId: string, userId: string) {
    const isCommissioner = await this.isUserCommissioner(interaction.guildId, userId);
    
    if (!isCommissioner) {
      await interaction.reply({
        content: 'Only commissioners can reject trades.',
        ephemeral: true
      });
      return;
    }

    // For now, reject with a default reason
    // In a full implementation, you might show a modal for the reason
    const result = await this.rejectTrade(tradeId, userId, 'Rejected by commissioner');
    
    if (result.success) {
      await interaction.reply({
        content: `❌ Trade ${tradeId.slice(-6)} has been rejected.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Failed to reject trade: ${result.error}`,
        ephemeral: true
      });
    }
  }

  private async handleDetailsButton(interaction: any, tradeId: string) {
    const trade = await this.getTradeById(tradeId);
    
    if (!trade) {
      await interaction.reply({
        content: 'Trade not found.',
        ephemeral: true
      });
      return;
    }

    // Create detailed embed (simplified for this example)
    const embed = {
      title: `🔄 Trade Details - ${tradeId.slice(-6)}`,
      description: `**Status:** ${trade.status.toUpperCase()}`,
      fields: [
        {
          name: 'Proposed By',
          value: `<@${trade.proposedBy}>`,
          inline: true
        },
        {
          name: 'Proposed At',
          value: `<t:${Math.floor(trade.proposedAt.getTime() / 1000)}:F>`,
          inline: true
        }
      ],
      color: 0xFF6B35,
      timestamp: new Date().toISOString()
    };

    if (trade.notes) {
      embed.fields.push({
        name: 'Notes',
        value: trade.notes,
        inline: false
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }

  private async handleTradeProposalModal(interaction: any, toUserId: string) {
    const yourAssets = interaction.fields.getTextInputValue('your_assets');
    const theirAssets = interaction.fields.getTextInputValue('their_assets');
    const notes = interaction.fields.getTextInputValue('notes') || undefined;

    try {
      const fromAssets = await this.parseTradeAssets(yourAssets);
      const toAssets = await this.parseTradeAssets(theirAssets);

      if (fromAssets.length === 0 || toAssets.length === 0) {
        await interaction.reply({
          content: '❌ Invalid trade assets. Please check your formatting.',
          ephemeral: true
        });
        return;
      }

      // For this example, we'll use placeholder team IDs
      // In a real implementation, you'd get the actual team IDs for the users
      const result = await this.proposeTrade(
        'placeholder-league-id', // Would get actual league ID
        1, // Would get actual from team ID
        2, // Would get actual to team ID
        fromAssets,
        toAssets,
        interaction.user.id,
        notes
      );

      if (result.success) {
        await interaction.reply({
          content: `✅ Trade proposal submitted! Trade ID: ${result.trade!.id.slice(-6)}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to propose trade: ${result.error}`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('❌ Error handling trade proposal modal:', error);
      await interaction.reply({
        content: '❌ An error occurred while proposing the trade.',
        ephemeral: true
      });
    }
  }

  private async getLeagueIdForGuild(guildId: string): Promise<string | null> {
    try {
      const doc = await db.collection("league_settings").doc(guildId).get();
      const settings = doc.exists ? doc.data() : null;
      return settings?.commands?.madden_league?.league_id || null;
    } catch (error) {
      console.error('❌ Error getting league ID for guild:', error);
      return null;
    }
  }
}