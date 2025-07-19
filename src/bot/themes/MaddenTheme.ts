import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder } from 'discord.js';
import { MaddenGame, Team, Player, Standing } from '../../export/madden_league_types';
import { TeamList } from '../../db/madden_db';

export interface Trade {
  id: string;
  leagueId: string;
  fromTeamId: number;
  toTeamId: number;
  fromAssets: TradeAsset[];
  toAssets: TradeAsset[];
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  proposedBy: string;
  proposedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface TradeAsset {
  type: 'player' | 'pick' | 'cash';
  playerId?: number;
  playerName?: string;
  pickRound?: number;
  pickYear?: number;
  cashAmount?: number;
}

export interface Commissioner {
  id: string;
  leagueId: string;
  discordUserId: string;
  role: 'head_commissioner' | 'assistant_commissioner';
  permissions: string[];
  appointedAt: Date;
  appointedBy: string;
}

export class MaddenTheme {
  static readonly COLORS = {
    PRIMARY: 0xFF6B35, // Madden Orange
    SECONDARY: 0x1E3A8A, // Madden Blue
    SUCCESS: 0x10B981, // Green
    WARNING: 0xF59E0B, // Yellow
    ERROR: 0xEF4444, // Red
    BACKGROUND: 0x0F172A, // Dark Blue
    ACCENT: 0x8B5CF6, // Purple
    INFO: 0x3B82F6 // Light Blue
  };

  static readonly EMOJIS = {
    FOOTBALL: '🏈',
    TROPHY: '🏆',
    CHART: '📊',
    TRADE: '🔄',
    STAR: '⭐',
    WARNING: '⚠️',
    CHECK: '✅',
    CROSS: '❌',
    FIRE: '🔥',
    CROWN: '👑',
    MONEY: '💰',
    CALENDAR: '📅',
    CLOCK: '⏰',
    BELL: '🔔',
    SHIELD: '🛡️',
    LIGHTNING: '⚡',
    TARGET: '🎯',
    ROCKET: '🚀'
  };

  static readonly TEAM_LOGOS = {
    // NFL team logo URLs - these would be actual team logo URLs
    DEFAULT: 'https://maddenvfl.com/assets/default-team-logo.png'
  };

  // Game Result Embeds
  createGameResultEmbed(game: MaddenGame, teams: TeamList): EmbedBuilder {
    const awayTeam = teams.getTeamForId(game.awayTeamId);
    const homeTeam = teams.getTeamForId(game.homeTeamId);
    
    const isAwayWin = game.awayScore > game.homeScore;
    const winner = isAwayWin ? awayTeam : homeTeam;
    const loser = isAwayWin ? homeTeam : awayTeam;
    const winnerScore = isAwayWin ? game.awayScore : game.homeScore;
    const loserScore = isAwayWin ? game.homeScore : game.awayScore;

    const embed = new EmbedBuilder()
      .setColor(this.COLORS.PRIMARY)
      .setTitle(`${this.EMOJIS.FOOTBALL} Game Result - Week ${game.weekIndex + 1}`)
      .setDescription(`**${winner.displayName}** defeats **${loser.displayName}** ${winnerScore}-${loserScore}`)
      .addFields([
        {
          name: `${isAwayWin ? this.EMOJIS.TROPHY : ''} ${awayTeam.displayName}`,
          value: `**${game.awayScore}**\n${awayTeam.cityName}`,
          inline: true
        },
        {
          name: 'vs',
          value: `${this.EMOJIS.LIGHTNING}\nFinal`,
          inline: true
        },
        {
          name: `${!isAwayWin ? this.EMOJIS.TROPHY : ''} ${homeTeam.displayName}`,
          value: `**${game.homeScore}**\n${homeTeam.cityName}`,
          inline: true
        }
      ])
      .setThumbnail(this.TEAM_LOGOS.DEFAULT)
      .setFooter({ 
        text: 'VFL Manager • Live Updates', 
        iconURL: 'https://maddenvfl.com/favicon.ico' 
      })
      .setTimestamp();

    return embed;
  }

  // Trade Embeds
  createTradeEmbed(trade: Trade): EmbedBuilder {
    const statusColor = this.getTradeStatusColor(trade.status);
    const statusEmoji = this.getTradeStatusEmoji(trade.status);

    const embed = new EmbedBuilder()
      .setColor(statusColor)
      .setTitle(`${this.EMOJIS.TRADE} Trade Proposal`)
      .setDescription(`**Status:** ${statusEmoji} ${trade.status.toUpperCase()}`)
      .addFields([
        {
          name: '📤 Sending Team',
          value: this.formatTradeAssets(trade.fromAssets),
          inline: true
        },
        {
          name: '🔄',
          value: 'for',
          inline: true
        },
        {
          name: '📥 Receiving Team',
          value: this.formatTradeAssets(trade.toAssets),
          inline: true
        }
      ])
      .addFields([
        {
          name: 'Proposed By',
          value: `<@${trade.proposedBy}>`,
          inline: true
        },
        {
          name: 'Proposed At',
          value: `<t:${Math.floor(trade.proposedAt.getTime() / 1000)}:R>`,
          inline: true
        }
      ])
      .setFooter({ text: `Trade ID: ${trade.id}` })
      .setTimestamp(trade.proposedAt);

    if (trade.reviewedBy && trade.reviewedAt) {
      embed.addFields([
        {
          name: 'Reviewed By',
          value: `<@${trade.reviewedBy}>`,
          inline: true
        },
        {
          name: 'Reviewed At',
          value: `<t:${Math.floor(trade.reviewedAt.getTime() / 1000)}:R>`,
          inline: true
        }
      ]);
    }

    return embed;
  }

  createTradeListEmbed(trades: Trade[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.COLORS.SECONDARY)
      .setTitle(`${this.EMOJIS.TRADE} Active Trades`)
      .setDescription(trades.length === 0 ? 'No active trades' : `${trades.length} pending trade(s)`)
      .setTimestamp();

    if (trades.length > 0) {
      const tradeList = trades.slice(0, 10).map((trade, index) => {
        const statusEmoji = this.getTradeStatusEmoji(trade.status);
        return `${index + 1}. ${statusEmoji} **Trade ${trade.id.slice(-6)}**\n` +
               `   Proposed <t:${Math.floor(trade.proposedAt.getTime() / 1000)}:R>`;
      }).join('\n\n');

      embed.addFields([
        {
          name: 'Recent Trades',
          value: tradeList,
          inline: false
        }
      ]);
    }

    return embed;
  }

  // Commissioner Embeds
  createCommissionerEmbed(commissioners: Commissioner[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.COLORS.ACCENT)
      .setTitle(`${this.EMOJIS.CROWN} League Commissioners`)
      .setDescription(`${commissioners.length} active commissioner(s)`)
      .setTimestamp();

    if (commissioners.length > 0) {
      const headCommissioners = commissioners.filter(c => c.role === 'head_commissioner');
      const assistantCommissioners = commissioners.filter(c => c.role === 'assistant_commissioner');

      if (headCommissioners.length > 0) {
        embed.addFields([
          {
            name: `${this.EMOJIS.CROWN} Head Commissioners`,
            value: headCommissioners.map(c => 
              `<@${c.discordUserId}>\nAppointed <t:${Math.floor(c.appointedAt.getTime() / 1000)}:R>`
            ).join('\n\n'),
            inline: false
          }
        ]);
      }

      if (assistantCommissioners.length > 0) {
        embed.addFields([
          {
            name: `${this.EMOJIS.SHIELD} Assistant Commissioners`,
            value: assistantCommissioners.map(c => 
              `<@${c.discordUserId}>\nAppointed <t:${Math.floor(c.appointedAt.getTime() / 1000)}:R>`
            ).join('\n\n'),
            inline: false
          }
        ]);
      }
    }

    return embed;
  }

  // Stats Embeds
  createStandingsEmbed(standings: Standing[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.COLORS.INFO)
      .setTitle(`${this.EMOJIS.TROPHY} League Standings`)
      .setTimestamp();

    const standingsText = standings.slice(0, 16).map((standing, index) => {
      const rank = index + 1;
      const rankEmoji = rank === 1 ? this.EMOJIS.TROPHY : 
                      rank <= 3 ? this.EMOJIS.STAR : 
                      rank.toString();
      
      return `${rankEmoji} **${standing.teamName}** (${standing.totalWins}-${standing.totalLosses}${standing.totalTies > 0 ? `-${standing.totalTies}` : ''})`;
    }).join('\n');

    embed.setDescription(standingsText);

    return embed;
  }

  createPlayerStatsEmbed(player: Player, stats: any): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.COLORS.SUCCESS)
      .setTitle(`${this.EMOJIS.STAR} ${player.firstName} ${player.lastName}`)
      .setDescription(`${player.position} • Overall: ${player.playerBestOvr}`)
      .addFields([
        {
          name: 'Team',
          value: player.teamId > 0 ? `Team ${player.teamId}` : 'Free Agent',
          inline: true
        },
        {
          name: 'Age',
          value: `${player.age} years old`,
          inline: true
        },
        {
          name: 'Experience',
          value: `${player.yearsPro} years`,
          inline: true
        }
      ])
      .setTimestamp();

    // Add position-specific stats
    if (player.position === 'QB' && stats.passing) {
      embed.addFields([
        {
          name: 'Passing Stats',
          value: `**${stats.passing.passYds}** yards\n**${stats.passing.passTDs}** TDs\n**${stats.passing.passInts}** INTs`,
          inline: true
        }
      ]);
    }

    return embed;
  }

  // Notification Embeds
  createRatingChangeEmbed(player: Player, oldRating: number, newRating: number): EmbedBuilder {
    const isIncrease = newRating > oldRating;
    const change = Math.abs(newRating - oldRating);
    const emoji = isIncrease ? this.EMOJIS.FIRE : this.EMOJIS.WARNING;
    const color = isIncrease ? this.COLORS.SUCCESS : this.COLORS.WARNING;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} Rating Change`)
      .setDescription(`**${player.firstName} ${player.lastName}** (${player.position})`)
      .addFields([
        {
          name: 'Previous Rating',
          value: `${oldRating}`,
          inline: true
        },
        {
          name: isIncrease ? '📈' : '📉',
          value: `${isIncrease ? '+' : '-'}${change}`,
          inline: true
        },
        {
          name: 'New Rating',
          value: `${newRating}`,
          inline: true
        }
      ])
      .setTimestamp();

    return embed;
  }

  createWaiverClaimEmbed(player: Player, claimingTeam: Team, priority: number): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.COLORS.INFO)
      .setTitle(`${this.EMOJIS.TARGET} Waiver Claim`)
      .setDescription(`**${claimingTeam.displayName}** claims **${player.firstName} ${player.lastName}**`)
      .addFields([
        {
          name: 'Player',
          value: `${player.firstName} ${player.lastName}\n${player.position} • ${player.playerBestOvr} OVR`,
          inline: true
        },
        {
          name: 'Claiming Team',
          value: `${claimingTeam.displayName}\n${claimingTeam.cityName}`,
          inline: true
        },
        {
          name: 'Waiver Priority',
          value: `#${priority}`,
          inline: true
        }
      ])
      .setTimestamp();

    return embed;
  }

  // Error and Success Embeds
  createErrorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.COLORS.ERROR)
      .setTitle(`${this.EMOJIS.CROSS} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  createSuccessEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.COLORS.SUCCESS)
      .setTitle(`${this.EMOJIS.CHECK} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  createInfoEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.COLORS.INFO)
      .setTitle(`${this.EMOJIS.BELL} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  // Action Rows and Components
  createTradeActionButtons(trade: Trade): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (trade.status === 'pending') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`trade_approve_${trade.id}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setEmoji(this.EMOJIS.CHECK),
        new ButtonBuilder()
          .setCustomId(`trade_reject_${trade.id}`)
          .setLabel('Reject')
          .setStyle(ButtonStyle.Danger)
          .setEmoji(this.EMOJIS.CROSS),
        new ButtonBuilder()
          .setCustomId(`trade_details_${trade.id}`)
          .setLabel('Details')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(this.EMOJIS.CHART)
      );
    }

    return row;
  }

  createRefreshButton(type: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`refresh_${type}`)
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );
  }

  createTeamSelectMenu(teams: Team[], customId: string): ActionRowBuilder<SelectMenuBuilder> {
    const options = teams.slice(0, 25).map(team => ({
      label: team.displayName,
      value: team.teamId.toString(),
      description: team.cityName,
      emoji: this.EMOJIS.FOOTBALL
    }));

    const selectMenu = new SelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select a team...')
      .addOptions(options);

    return new ActionRowBuilder<SelectMenuBuilder>().addComponents(selectMenu);
  }

  // Helper Methods
  private formatTradeAssets(assets: TradeAsset[]): string {
    if (assets.length === 0) return 'Nothing';

    return assets.map(asset => {
      switch (asset.type) {
        case 'player':
          return `${this.EMOJIS.STAR} ${asset.playerName}`;
        case 'pick':
          return `${this.EMOJIS.TARGET} ${asset.pickYear} Round ${asset.pickRound} Pick`;
        case 'cash':
          return `${this.EMOJIS.MONEY} $${asset.cashAmount?.toLocaleString()}`;
        default:
          return 'Unknown Asset';
      }
    }).join('\n');
  }

  private getTradeStatusColor(status: string): number {
    switch (status) {
      case 'pending': return this.COLORS.WARNING;
      case 'approved': return this.COLORS.SUCCESS;
      case 'rejected': return this.COLORS.ERROR;
      case 'completed': return this.COLORS.SUCCESS;
      default: return this.COLORS.BACKGROUND;
    }
  }

  private getTradeStatusEmoji(status: string): string {
    switch (status) {
      case 'pending': return this.EMOJIS.CLOCK;
      case 'approved': return this.EMOJIS.CHECK;
      case 'rejected': return this.EMOJIS.CROSS;
      case 'completed': return this.EMOJIS.TROPHY;
      default: return this.EMOJIS.WARNING;
    }
  }
}