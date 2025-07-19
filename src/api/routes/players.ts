import { Router } from 'express';
import { Request, Response } from 'express';
import MaddenDB from '../../db/madden_db';
import { Player, POSITIONS } from '../../export/madden_league_types';
import { config } from '../../config/environment';

const router = Router();

// Player interfaces for API responses
interface PlayerResponse {
  player: Player;
  stats: {
    career: any;
    season: any;
    recentGames: any[];
  };
  team: any;
  comparisons?: Player[];
}

interface PlayersResponse {
  players: Player[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

interface PlayerComparisonResponse {
  players: Player[];
  comparison: {
    ratings: any;
    stats: any;
    contracts: any;
  };
}

// GET /api/players - List players with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      league_id,
      team,
      position,
      rating_min,
      rating_max,
      rookie,
      limit = '50',
      page = '1'
    } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    const limitNum = Math.min(parseInt(limit as string), config.performance.api.maxPlayersPerRequest);
    const pageNum = parseInt(page as string);
    const offset = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = {};
    
    if (team && team !== '-1') {
      query.teamId = parseInt(team as string);
    }
    
    if (position && POSITIONS.includes(position as string)) {
      query.position = position;
    }
    
    if (rookie === 'true') {
      query.rookie = true;
    }

    // Get players from database
    const players = await MaddenDB.getPlayers(
      league_id as string,
      query,
      limitNum,
      undefined, // startAfter
      undefined  // endBefore
    );

    // Filter by rating if specified
    let filteredPlayers = players;
    if (rating_min || rating_max) {
      filteredPlayers = players.filter(player => {
        const rating = player.playerBestOvr;
        const minRating = rating_min ? parseInt(rating_min as string) : 0;
        const maxRating = rating_max ? parseInt(rating_max as string) : 99;
        return rating >= minRating && rating <= maxRating;
      });
    }

    // Create response
    const response: PlayersResponse = {
      players: filteredPlayers,
      pagination: {
        total: filteredPlayers.length, // This would need to be calculated properly
        page: pageNum,
        limit: limitNum,
        hasNext: filteredPlayers.length === limitNum
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/players/:slug - Get individual player details
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Convert slug to roster ID (assuming slug format: firstname-lastname-rosterid)
    const rosterIdMatch = slug.match(/-(\d+)$/);
    if (!rosterIdMatch) {
      return res.status(400).json({ error: 'Invalid player slug format' });
    }

    const rosterId = rosterIdMatch[1];

    // Get player data
    const player = await MaddenDB.getPlayer(league_id as string, rosterId);
    const playerStats = await MaddenDB.getPlayerStats(league_id as string, player);
    
    // Get team data
    const teams = await MaddenDB.getLatestTeams(league_id as string);
    const team = player.teamId > 0 ? teams.getTeamForId(player.teamId) : null;

    // Get similar players (same position, similar rating)
    const similarPlayers = await MaddenDB.getPlayers(
      league_id as string,
      { 
        position: player.position,
        teamId: player.teamId !== 0 ? undefined : 0 // Exclude same team unless free agent
      },
      5
    );

    const response: PlayerResponse = {
      player: {
        ...player,
        websiteSlug: slug
      },
      stats: {
        career: playerStats,
        season: playerStats,
        recentGames: []
      },
      team,
      comparisons: similarPlayers.filter(p => 
        p.rosterId !== player.rosterId && 
        Math.abs(p.playerBestOvr - player.playerBestOvr) <= 5
      ).slice(0, 3)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching player:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Player not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/players/compare - Compare multiple players
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const { league_id, players: playerIds } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    if (!playerIds) {
      return res.status(400).json({ error: 'players parameter is required' });
    }

    const playerIdArray = (playerIds as string).split(',').slice(0, config.performance.api.maxComparisonPlayers);

    if (playerIdArray.length < 2) {
      return res.status(400).json({ error: 'At least 2 players are required for comparison' });
    }

    // Get all players
    const players = await Promise.all(
      playerIdArray.map(id => MaddenDB.getPlayer(league_id as string, id))
    );

    // Get stats for all players
    const playersWithStats = await Promise.all(
      players.map(async player => {
        const stats = await MaddenDB.getPlayerStats(league_id as string, player);
        return { player, stats };
      })
    );

    // Create comparison data
    const comparison = {
      ratings: createRatingComparison(players),
      stats: createStatsComparison(playersWithStats),
      contracts: createContractComparison(players)
    };

    const response: PlayerComparisonResponse = {
      players,
      comparison
    };

    res.json(response);
  } catch (error) {
    console.error('Error comparing players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/players/:id/watch - Add player to watch list
router.post('/:id/watch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, league_id } = req.body;

    if (!user_id || !league_id) {
      return res.status(400).json({ error: 'user_id and league_id are required' });
    }

    // Implementation for adding player to watch list
    // This would integrate with the notification system
    
    res.json({ success: true, message: 'Player added to watch list' });
  } catch (error) {
    console.error('Error adding player to watch list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function createRatingComparison(players: Player[]) {
  const ratingCategories = [
    'speedRating', 'strengthRating', 'agilityRating', 'awareRating',
    'throwPowerRating', 'throwAccRating', 'catchRating', 'carryRating'
  ];

  const comparison: any = {};
  
  ratingCategories.forEach(category => {
    comparison[category] = players.map(player => ({
      playerId: player.rosterId,
      value: (player as any)[category] || 0
    }));
  });

  return comparison;
}

function createStatsComparison(playersWithStats: any[]) {
  // Implementation for stats comparison
  return {
    passing: playersWithStats.map(p => p.stats.passing || {}),
    rushing: playersWithStats.map(p => p.stats.rushing || {}),
    receiving: playersWithStats.map(p => p.stats.receiving || {}),
    defense: playersWithStats.map(p => p.stats.defense || {})
  };
}

function createContractComparison(players: Player[]) {
  return players.map(player => ({
    playerId: player.rosterId,
    salary: player.contractSalary || 0,
    yearsLeft: player.contractYearsLeft || 0,
    bonus: player.contractBonus || 0
  }));
}

export default router;