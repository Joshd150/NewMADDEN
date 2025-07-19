import { SlashCommandBuilder, CommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { VFLManager } from '../VFLManager';
import { Trade, TradeAsset } from '../themes/MaddenTheme';
import { TradeService } from '../services/TradeService';

export class TradeCommand {
  static readonly data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Manage trades in your league')
    .addSubcommand(subcommand =>
      subcommand
        .setName('propose')
        .setDescription('Propose a new trade')
        .addUserOption(option =>
          option.setName('to_user')
            .setDescription('User to trade with')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View pending trades')
        .addStringOption(option =>
          option.setName('status')
            .setDescription('Filter by trade status')
            .addChoices(
              { name: 'Pending', value: 'pending' },
              { name: 'Approved', value: 'approved' },
              { name: 'Rejected', value: 'rejected' },
              { name: 'Completed', value: 'completed' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Approve a trade (Commissioners only)')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to approve')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reject')
        .setDescription('Reject a trade (Commissioners only)')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to reject')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for rejection')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('details')
        .setDescription('View detailed information about a trade')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to view')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View trade history for a user or team')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to view trade history for')
        )
        .addStringOption(option =>
          option.setName('team')
            .setDescription('Team to view trade history for')
        )
    );

  static async execute(interaction: CommandInteraction, client: VFLManager) {
    const subcommand = interaction.options.getSubcommand();
    const tradeService = client.getTradeService();
    const theme = client.getTheme();
    
    try {
      switch (subcommand) {
        case 'propose':
          await this.handlePropose(interaction, client);
          break;
        case 'list':
          await this.handleList(interaction, tradeService, theme);
          break;
        case 'approve':
          await this.handleApprove(interaction, tradeService, theme);
          break;
        case 'reject':
          await this.handleReject(interaction, tradeService, theme);
          break;
        case 'details':
          await this.handleDetails(interaction, tradeService, theme);
          break;
        case 'history':
          await this.handleHistory(interaction, tradeService, theme);
          break;
        default:
          await interaction.reply({
            embeds: [theme.createErrorEmbed('Unknown Command', 'Unknown trade subcommand.')],
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('❌ Error in trade command:', error);
      
      const errorEmbed = theme.createErrorEmbed(
        'Trade Command Error',
        'An error occurred while processing your trade command.'
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }

  private static async handlePropose(interaction: CommandInteraction, client: VFLManager) {
    const toUser = interaction.options.getUser('to_user', true);
    const theme = client.getTheme();

    // Create modal for trade proposal
    const modal = new ModalBuilder()
      .setCustomId(`trade_propose_${toUser.id}`)
      .setTitle('Propose Trade');

    const yourAssetsInput = new TextInputBuilder()
      .setCustomId('your_assets')
      .setLabel('Your Assets (one per line)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Example:\nPlayer: John Doe\nPick: 2024 Round 1\nCash: 500000')
      .setRequired(true)
      .setMaxLength(1000);

    const theirAssetsInput = new TextInputBuilder()
      .setCustomId('their_assets')
      .setLabel('Their Assets (one per line)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Example:\nPlayer: Jane Smith\nPick: 2024 Round 2')
      .setRequired(true)
      .setMaxLength(1000);

    const notesInput = new TextInputBuilder()
      .setCustomId('notes')
      .setLabel('Trade Notes (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Any additional notes about this trade...')
      .setRequired(false)
      .setMaxLength(500);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(yourAssetsInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(theirAssetsInput);
    const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    await interaction.showModal(modal);
  }

  private static async handleList(interaction: CommandInteraction, tradeService: TradeService, theme: any) {
    await interaction.deferReply();

    const status = interaction.options.getString('status') || 'pending';
    const guildId = interaction.guildId!;

    try {
      const trades = await tradeService.getTradesByStatus(guildId, status as any);
      
      if (trades.length === 0) {
        const embed = theme.createInfoEmbed(
          'No Trades Found',
          `No ${status} trades found for this league.`
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embed = theme.createTradeListEmbed(trades);
      const refreshButton = theme.createRefreshButton('trades');

      await interaction.editReply({ 
        embeds: [embed], 
        components: [refreshButton] 
      });
    } catch (error) {
      console.error('❌ Error listing trades:', error);
      const errorEmbed = theme.createErrorEmbed(
        'Error',
        'Failed to retrieve trades. Please try again.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }

  private static async handleApprove(interaction: CommandInteraction, tradeService: TradeService, theme: any) {
    const tradeId = interaction.options.getString('trade_id', true);
    const userId = interaction.user.id;

    await interaction.deferReply();

    try {
      // Check if user is a commissioner
      const isCommissioner = await tradeService.isUserCommissioner(interaction.guildId!, userId);
      
      if (!isCommissioner) {
        const errorEmbed = theme.createErrorEmbed(
          'Permission Denied',
          'Only commissioners can approve trades.'
        );
        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      const result = await tradeService.approveTrade(tradeId, userId);
      
      if (result.success) {
        const successEmbed = theme.createSuccessEmbed(
          'Trade Approved',
          `Trade ${tradeId} has been approved successfully.`
        );
        await interaction.editReply({ embeds: [successEmbed] });
      } else {
        const errorEmbed = theme.createErrorEmbed(
          'Approval Failed',
          result.error || 'Failed to approve trade.'
        );
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error('❌ Error approving trade:', error);
      const errorEmbed = theme.createErrorEmbed(
        'Error',
        'An error occurred while approving the trade.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }

  private static async handleReject(interaction: CommandInteraction, tradeService: TradeService, theme: any) {
    const tradeId = interaction.options.getString('trade_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const userId = interaction.user.id;

    await interaction.deferReply();

    try {
      // Check if user is a commissioner
      const isCommissioner = await tradeService.isUserCommissioner(interaction.guildId!, userId);
      
      if (!isCommissioner) {
        const errorEmbed = theme.createErrorEmbed(
          'Permission Denied',
          'Only commissioners can reject trades.'
        );
        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      const result = await tradeService.rejectTrade(tradeId, userId, reason);
      
      if (result.success) {
        const successEmbed = theme.createSuccessEmbed(
          'Trade Rejected',
          `Trade ${tradeId} has been rejected.\n**Reason:** ${reason}`
        );
        await interaction.editReply({ embeds: [successEmbed] });
      } else {
        const errorEmbed = theme.createErrorEmbed(
          'Rejection Failed',
          result.error || 'Failed to reject trade.'
        );
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    } catch (error) {
      console.error('❌ Error rejecting trade:', error);
      const errorEmbed = theme.createErrorEmbed(
        'Error',
        'An error occurred while rejecting the trade.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }

  private static async handleDetails(interaction: CommandInteraction, tradeService: TradeService, theme: any) {
    const tradeId = interaction.options.getString('trade_id', true);

    await interaction.deferReply();

    try {
      const trade = await tradeService.getTradeById(tradeId);
      
      if (!trade) {
        const errorEmbed = theme.createErrorEmbed(
          'Trade Not Found',
          `No trade found with ID: ${tradeId}`
        );
        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      const embed = theme.createTradeEmbed(trade);
      
      // Add detailed information
      embed.addFields([
        {
          name: 'Trade ID',
          value: trade.id,
          inline: true
        },
        {
          name: 'League ID',
          value: trade.leagueId,
          inline: true
        }
      ]);

      if (trade.notes) {
        embed.addFields([
          {
            name: 'Notes',
            value: trade.notes,
            inline: false
          }
        ]);
      }

      const components = [];
      if (trade.status === 'pending') {
        components.push(theme.createTradeActionButtons(trade));
      }

      await interaction.editReply({ 
        embeds: [embed], 
        components 
      });
    } catch (error) {
      console.error('❌ Error getting trade details:', error);
      const errorEmbed = theme.createErrorEmbed(
        'Error',
        'Failed to retrieve trade details.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }

  private static async handleHistory(interaction: CommandInteraction, tradeService: TradeService, theme: any) {
    const user = interaction.options.getUser('user');
    const team = interaction.options.getString('team');

    await interaction.deferReply();

    try {
      let trades: Trade[] = [];
      let title = 'Trade History';

      if (user) {
        trades = await tradeService.getTradesForUser(interaction.guildId!, user.id);
        title = `Trade History for ${user.displayName}`;
      } else if (team) {
        trades = await tradeService.getTradesForTeam(interaction.guildId!, team);
        title = `Trade History for ${team}`;
      } else {
        trades = await tradeService.getAllTrades(interaction.guildId!);
        title = 'All Trade History';
      }

      if (trades.length === 0) {
        const embed = theme.createInfoEmbed(
          'No Trade History',
          'No trades found for the specified criteria.'
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create paginated embed for trade history
      const embed = new EmbedBuilder()
        .setColor(theme.COLORS.SECONDARY)
        .setTitle(`🔄 ${title}`)
        .setDescription(`Found ${trades.length} trade(s)`)
        .setTimestamp();

      const tradeList = trades.slice(0, 10).map((trade, index) => {
        const statusEmoji = theme.getTradeStatusEmoji ? theme.getTradeStatusEmoji(trade.status) : '🔄';
        return `${index + 1}. ${statusEmoji} **${trade.id.slice(-6)}** - ${trade.status}\n` +
               `   Proposed <t:${Math.floor(trade.proposedAt.getTime() / 1000)}:R>`;
      }).join('\n\n');

      embed.addFields([
        {
          name: 'Recent Trades',
          value: tradeList,
          inline: false
        }
      ]);

      if (trades.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${trades.length} trades` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Error getting trade history:', error);
      const errorEmbed = theme.createErrorEmbed(
        'Error',
        'Failed to retrieve trade history.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}