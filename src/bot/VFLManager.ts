import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, Collection, SlashCommandBuilder } from 'discord.js';
import { MaddenTheme } from './themes/MaddenTheme';
import { ChannelManager } from './services/ChannelManager';
import { TradeService } from './services/TradeService';
import { CommissionerService } from './services/CommissionerService';
import { NotificationService } from './services/NotificationService';

// Import existing services (preserve EA logic)
import { createClient as createDiscordClient } from '../discord/discord_utils';
import MaddenDB from '../db/madden_db';
import EventDB from '../db/events_db';

export class VFLManager extends Client {
  private maddenTheme: MaddenTheme;
  private channelManager: ChannelManager;
  private tradeService: TradeService;
  private commissionerService: CommissionerService;
  private notificationService: NotificationService;
  public commands: Collection<string, any>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
      ]
    });
    
    this.commands = new Collection();
    this.maddenTheme = new MaddenTheme();
    this.channelManager = new ChannelManager(this);
    this.tradeService = new TradeService();
    this.commissionerService = new CommissionerService();
    this.notificationService = new NotificationService(this);
    
    this.setupEventHandlers();
    this.loadCommands();
  }

  private setupEventHandlers() {
    this.on('ready', this.onReady.bind(this));
    this.on('interactionCreate', this.onInteraction.bind(this));
    
    // Preserve existing EA data event handlers
    this.setupEAEventHandlers();
  }

  private setupEAEventHandlers() {
    // Keep existing EA integration logic intact
    MaddenDB.on("MADDEN_SCHEDULE", this.channelManager.handleGameUpdate.bind(this.channelManager));
    MaddenDB.on("MADDEN_PLAYER", this.channelManager.handlePlayerUpdate.bind(this.channelManager));
    MaddenDB.on("MADDEN_TEAM", this.channelManager.handleTeamUpdate.bind(this.channelManager));
    
    // New VFL Manager events
    EventDB.on("TRADE_PROPOSED", this.channelManager.handleTradeProposed.bind(this.channelManager));
    EventDB.on("TRADE_COMPLETED", this.channelManager.handleTradeCompleted.bind(this.channelManager));
    EventDB.on("COMMISSIONER_APPOINTED", this.channelManager.handleCommissionerUpdate.bind(this.channelManager));
    EventDB.on("RATING_CHANGE", this.channelManager.handleRatingChange.bind(this.channelManager));
    EventDB.on("WAIVER_CLAIM", this.channelManager.handleWaiverClaim.bind(this.channelManager));
    EventDB.on("ROSTER_MOVE", this.channelManager.handleRosterMove.bind(this.channelManager));
  }

  private async loadCommands() {
    // Import all command modules
    const { TradeCommand } = await import('./commands/TradeCommand');
    const { CommissionerCommand } = await import('./commands/CommissionerCommand');
    const { LeagueCommand } = await import('./commands/LeagueCommand');
    const { StatsCommand } = await import('./commands/StatsCommand');
    const { SetupCommand } = await import('./commands/SetupCommand');
    
    // Register commands
    this.commands.set('trade', TradeCommand);
    this.commands.set('commissioner', CommissionerCommand);
    this.commands.set('league', LeagueCommand);
    this.commands.set('stats', StatsCommand);
    this.commands.set('setup', SetupCommand);
  }

  private async onReady() {
    console.log(`🏈 VFL Manager is ready! Logged in as ${this.user?.tag}`);
    console.log(`📊 Connected to ${this.guilds.cache.size} servers`);
    
    // Set bot status
    this.user?.setActivity('Madden 26 Franchises', { type: 'WATCHING' });
    
    // Register slash commands
    await this.registerCommands();
    
    // Initialize services
    await this.channelManager.initialize();
    await this.notificationService.initialize();
  }

  private async registerCommands() {
    const commands = [];
    
    for (const [name, command] of this.commands) {
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    }

    try {
      console.log(`🔄 Refreshing ${commands.length} application (/) commands.`);
      
      // Register commands globally
      await this.application?.commands.set(commands);
      
      console.log(`✅ Successfully reloaded application (/) commands.`);
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  private async onInteraction(interaction: any) {
    if (interaction.isChatInputCommand()) {
      const command = this.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction, this);
      } catch (error) {
        console.error('❌ Error executing command:', error);
        
        const errorEmbed = this.maddenTheme.createErrorEmbed(
          'Command Error',
          'There was an error while executing this command!'
        );

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
    } else if (interaction.isButton()) {
      await this.handleButtonInteraction(interaction);
    } else if (interaction.isSelectMenu()) {
      await this.handleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await this.handleModalSubmit(interaction);
    }
  }

  private async handleButtonInteraction(interaction: any) {
    const [action, ...params] = interaction.customId.split('_');
    
    switch (action) {
      case 'trade':
        await this.tradeService.handleButtonInteraction(interaction, params);
        break;
      case 'commissioner':
        await this.commissionerService.handleButtonInteraction(interaction, params);
        break;
      case 'refresh':
        await this.handleRefreshButton(interaction, params);
        break;
      default:
        console.warn(`Unknown button interaction: ${action}`);
    }
  }

  private async handleSelectMenuInteraction(interaction: any) {
    const [action, ...params] = interaction.customId.split('_');
    
    switch (action) {
      case 'team':
        await this.handleTeamSelection(interaction, params);
        break;
      case 'player':
        await this.handlePlayerSelection(interaction, params);
        break;
      default:
        console.warn(`Unknown select menu interaction: ${action}`);
    }
  }

  private async handleModalSubmit(interaction: any) {
    const [action, ...params] = interaction.customId.split('_');
    
    switch (action) {
      case 'trade':
        await this.tradeService.handleModalSubmit(interaction, params);
        break;
      case 'commissioner':
        await this.commissionerService.handleModalSubmit(interaction, params);
        break;
      default:
        console.warn(`Unknown modal submit: ${action}`);
    }
  }

  private async handleRefreshButton(interaction: any, params: string[]) {
    const [type] = params;
    
    switch (type) {
      case 'trades':
        await this.refreshTradesDisplay(interaction);
        break;
      case 'standings':
        await this.refreshStandingsDisplay(interaction);
        break;
      case 'stats':
        await this.refreshStatsDisplay(interaction);
        break;
    }
  }

  private async refreshTradesDisplay(interaction: any) {
    const trades = await this.tradeService.getPendingTrades(interaction.guildId);
    const embed = this.maddenTheme.createTradeListEmbed(trades);
    
    await interaction.update({ embeds: [embed] });
  }

  private async refreshStandingsDisplay(interaction: any) {
    // Implementation for refreshing standings
    await interaction.deferUpdate();
  }

  private async refreshStatsDisplay(interaction: any) {
    // Implementation for refreshing stats
    await interaction.deferUpdate();
  }

  private async handleTeamSelection(interaction: any, params: string[]) {
    // Implementation for team selection
    await interaction.deferUpdate();
  }

  private async handlePlayerSelection(interaction: any, params: string[]) {
    // Implementation for player selection
    await interaction.deferUpdate();
  }

  // Utility methods
  public getTheme() {
    return this.maddenTheme;
  }

  public getChannelManager() {
    return this.channelManager;
  }

  public getTradeService() {
    return this.tradeService;
  }

  public getCommissionerService() {
    return this.commissionerService;
  }

  public getNotificationService() {
    return this.notificationService;
  }
}

// Export singleton instance
export const vflManager = new VFLManager();