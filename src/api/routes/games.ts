import { Router } from 'express';
import { Request, Response } from 'express';
import MaddenDB from '../../db/madden_db';
import { MaddenGame, GameResult, getMessageForWeek } from '../../export/madden_league_types';
import { config } from '../../config/environment';

const router = Router();

// Game interfaces for API responses
interface GameResponse {
  game: MaddenGame;
  homeTeam: any;
  awayTeam: any;
  boxScore: BoxScore;
  playerStats: PlayerGameStats[];
}

interface ScheduleResponse {
  games: MaddenGame[];
  currentWeek: number;
  currentSeason: number;
  weekTitle: string;
}

interface BoxScore {
  final: {
    home: number;
    away: number;
  };
  quarters?: {
    [quarter: number]: {
      home: number;
      away: number;
    };
  };
  teamStats: {
    home: TeamGameStats;
    away: TeamGameStats;
  };
}

interface TeamGameStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  penalties: number;
  timeOfPossession: string;
  firstDowns: number;
  thirdDownConversions: string;
  fourthDownConversions: string;
}

interface PlayerGameStats {
  rosterId: number;
  playerName: string;
  position: string;
  teamId: number;
  stats: {
    passing?: any;
    rushing?: any;
    receiving?: any;
    defense?: any;
    kicking?: any;
  };
}

// GET /api/schedule - Get schedule for league
router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const { league_id, week, season, team } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    let games: MaddenGame[] = [];
    let currentWeek = 1;
    let currentSeason = 1;

    if (week && season) {
      // Get specific week/season
      games = await MaddenDB.getWeekScheduleForSeason(
        league_id as string,
        parseInt(week as string),
        parseInt(season as string)
      );
      currentWeek = parseInt(week as string);
      currentSeason = parseInt(season as string);
    } else {
      // Get current week (would need to determine current week logic)
      games = await MaddenDB.getLatestWeekSchedule(league_id as string, 1);
      currentWeek = 1;
      currentSeason = games[0]?.seasonIndex || 1;
    }

    // Filter by team if specified
    if (team) {
      const teamId = parseInt(team as string);
      games = games.filter(game => 
        game.homeTeamId === teamId || game.awayTeamId === teamId
      );
    }

    // Get team information for all games
    const teams = await MaddenDB.getLatestTeams(league_id as string);
    
    // Enhance games with team information and slugs
    const enhancedGames = games.map(game => ({
      ...game,
      homeTeam: teams.getTeamForId(game.homeTeamId),
      awayTeam: teams.getTeamForId(game.awayTeamId),
      websiteSlug: `week-${game.weekIndex + 1}-season-${game.seasonIndex}-game-${game.scheduleId}`,
      statusText: game.status === GameResult.NOT_PLAYED ? 'Scheduled' : 
                 game.status === GameResult.HOME_WIN ? 'Final' :
                 game.status === GameResult.AWAY_WIN ? 'Final' : 'Final'
    }));

    const response: ScheduleResponse = {
      games: enhancedGames,
      currentWeek,
      currentSeason,
      weekTitle: getMessageForWeek(currentWeek)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/games/:slug - Get detailed game information
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Parse slug to extract game information
    // Expected format: week-X-season-Y-game-Z
    const slugMatch = slug.match(/week-(\d+)-season-(\d+)-game-(\d+)/);
    if (!slugMatch) {
      return res.status(400).json({ error: 'Invalid game slug format' });
    }

    const week = parseInt(slugMatch[1]);
    const season = parseInt(slugMatch[2]);
    const scheduleId = parseInt(slugMatch[3]);

    // Get game data
    const game = await MaddenDB.getGameForSchedule(
      league_id as string,
      scheduleId,
      week,
      season
    );

    // Get team information
    const teams = await MaddenDB.getLatestTeams(league_id as string);
    const homeTeam = teams.getTeamForId(game.homeTeamId);
    const awayTeam = teams.getTeamForId(game.awayTeamId);

    // Get player stats for this game (if available)
    const playerStats: PlayerGameStats[] = [];
    
    // This would require implementing game-specific player stats
    // For now, we'll return empty array
    
    // Create box score
    const boxScore: BoxScore = {
      final: {
        home: game.homeScore,
        away: game.awayScore
      },
      teamStats: {
        home: {
          totalYards: 0, // Would need to calculate from player stats
          passingYards: 0,
          rushingYards: 0,
          turnovers: 0,
          penalties: 0,
          timeOfPossession: '30:00',
          firstDowns: 0,
          thirdDownConversions: '0/0',
          fourthDownConversions: '0/0'
        },
        away: {
          totalYards: 0,
          passingYards: 0,
          rushingYards: 0,
          turnovers: 0,
          penalties: 0,
          timeOfPossession: '30:00',
          firstDowns: 0,
          thirdDownConversions: '0/0',
          fourthDownConversions: '0/0'
        }
      }
    };

    const response: GameResponse = {
      game: {
        ...game,
        websiteSlug: slug
      },
      homeTeam,
      awayTeam,
      boxScore,
      playerStats
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching game:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Game not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/games/:slug/stats - Get detailed player stats for a game
router.get('/:slug/stats', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Parse slug and get game
    const slugMatch = slug.match(/week-(\d+)-season-(\d+)-game-(\d+)/);
    if (!slugMatch) {
      return res.status(400).json({ error: 'Invalid game slug format' });
    }

    const week = parseInt(slugMatch[1]);
    const season = parseInt(slugMatch[2]);
    const scheduleId = parseInt(slugMatch[3]);

    const game = await MaddenDB.getGameForSchedule(
      league_id as string,
      scheduleId,
      week,
      season
    );

    // Get all players for both teams
    const teams = await MaddenDB.getLatestTeams(league_id as string);
    const allPlayers = await MaddenDB.getLatestPlayers(league_id as string);
    
    const homeTeamPlayers = allPlayers.filter(p => p.teamId === game.homeTeamId);
    const awayTeamPlayers = allPlayers.filter(p => p.teamId === game.awayTeamId);

    // Get player stats for this specific game/week
    // This would require implementing week-specific stat queries
    const playerStats: PlayerGameStats[] = [];

    // For now, return structure without actual stats
    [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
      playerStats.push({
        rosterId: player.rosterId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        teamId: player.teamId,
        stats: {
          // Would populate with actual game stats
        }
      });
    });

    res.json({
      game: {
        ...game,
        websiteSlug: slug
      },
      homeTeam: teams.getTeamForId(game.homeTeamId),
      awayTeam: teams.getTeamForId(game.awayTeamId),
      playerStats: playerStats.slice(0, 50) // Limit response size
    });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/games/week/:week/season/:season - Get all games for specific week/season
router.get('/week/:week/season/:season', async (req: Request, res: Response) => {
  try {
    const { week, season } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    const weekNum = parseInt(week);
    const seasonNum = parseInt(season);

    if (weekNum < 1 || weekNum > 23 || weekNum === 22) {
      return res.status(400).json({ 
        error: 'Invalid week number. Valid weeks are 1-18 and playoffs: 19-21, 23' 
      });
    }

    const games = await MaddenDB.getWeekScheduleForSeason(
      league_id as string,
      weekNum,
      seasonNum
    );

    const teams = await MaddenDB.getLatestTeams(league_id as string);

    const enhancedGames = games.map(game => ({
      ...game,
      homeTeam: teams.getTeamForId(game.homeTeamId),
      awayTeam: teams.getTeamForId(game.awayTeamId),
      websiteSlug: `week-${game.weekIndex + 1}-season-${game.seasonIndex}-game-${game.scheduleId}`
    }));

    res.json({
      week: weekNum,
      season: seasonNum,
      weekTitle: getMessageForWeek(weekNum),
      games: enhancedGames
    });
  } catch (error) {
    console.error('Error fetching week games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;