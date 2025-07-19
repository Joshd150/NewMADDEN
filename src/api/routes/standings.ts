import { Router } from 'express';
import { Request, Response } from 'express';
import MaddenDB from '../../db/madden_db';
import { Standing, formatRecord } from '../../export/madden_league_types';
import { config } from '../../config/environment';

const router = Router();

// Standings interfaces for API responses
interface StandingsResponse {
  standings: Standing[];
  divisions: {
    [division: string]: Standing[];
  };
  conferences: {
    [conference: string]: Standing[];
  };
  history: WeeklyStandings[];
  lastUpdated: Date;
}

interface WeeklyStandings {
  week: number;
  season: number;
  standings: Standing[];
  timestamp: Date;
}

interface DivisionStandings {
  divisionName: string;
  conferenceName: string;
  teams: Standing[];
}

interface PlayoffPicture {
  afc: {
    clinched: Standing[];
    inHunt: Standing[];
    eliminated: Standing[];
  };
  nfc: {
    clinched: Standing[];
    inHunt: Standing[];
    eliminated: Standing[];
  };
}

// GET /api/standings - Get current league standings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { league_id, conference, division } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Get current standings
    const standings = await MaddenDB.getLatestStandings(league_id as string);
    
    if (standings.length === 0) {
      return res.status(404).json({ error: 'No standings found for this league' });
    }

    // Sort standings by rank
    const sortedStandings = standings.sort((a, b) => a.rank - b.rank);

    // Group by divisions
    const divisions: { [division: string]: Standing[] } = {};
    const conferences: { [conference: string]: Standing[] } = {};

    sortedStandings.forEach(standing => {
      // Group by division
      if (!divisions[standing.divisonName]) {
        divisions[standing.divisonName] = [];
      }
      divisions[standing.divisonName].push(standing);

      // Group by conference
      if (!conferences[standing.conferenceName]) {
        conferences[standing.conferenceName] = [];
      }
      conferences[standing.conferenceName].push(standing);
    });

    // Sort divisions and conferences
    Object.keys(divisions).forEach(div => {
      divisions[div].sort((a, b) => a.rank - b.rank);
    });

    Object.keys(conferences).forEach(conf => {
      conferences[conf].sort((a, b) => a.rank - b.rank);
    });

    // Filter by conference or division if specified
    let filteredStandings = sortedStandings;
    if (conference) {
      filteredStandings = sortedStandings.filter(s => 
        s.conferenceName.toLowerCase() === (conference as string).toLowerCase()
      );
    }
    if (division) {
      filteredStandings = sortedStandings.filter(s => 
        s.divisonName.toLowerCase() === (division as string).toLowerCase()
      );
    }

    // Get historical standings (placeholder - would need implementation)
    const history: WeeklyStandings[] = [];

    const response: StandingsResponse = {
      standings: filteredStandings,
      divisions,
      conferences,
      history,
      lastUpdated: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/standings/divisions - Get standings grouped by divisions
router.get('/divisions', async (req: Request, res: Response) => {
  try {
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    const standings = await MaddenDB.getLatestStandings(league_id as string);
    
    // Group by divisions with enhanced information
    const divisionStandings: DivisionStandings[] = [];
    const divisionsMap = new Map<string, Standing[]>();

    standings.forEach(standing => {
      if (!divisionsMap.has(standing.divisonName)) {
        divisionsMap.set(standing.divisonName, []);
      }
      divisionsMap.get(standing.divisonName)!.push(standing);
    });

    divisionsMap.forEach((teams, divisionName) => {
      const sortedTeams = teams.sort((a, b) => {
        // Sort by wins, then by win percentage, then by points differential
        if (a.totalWins !== b.totalWins) {
          return b.totalWins - a.totalWins;
        }
        if (a.winPct !== b.winPct) {
          return b.winPct - a.winPct;
        }
        return b.netPts - a.netPts;
      });

      divisionStandings.push({
        divisionName,
        conferenceName: teams[0].conferenceName,
        teams: sortedTeams
      });
    });

    // Sort divisions by conference
    divisionStandings.sort((a, b) => {
      if (a.conferenceName !== b.conferenceName) {
        return a.conferenceName.localeCompare(b.conferenceName);
      }
      return a.divisionName.localeCompare(b.divisionName);
    });

    res.json({
      divisions: divisionStandings,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching division standings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/standings/playoff-picture - Get playoff picture
router.get('/playoff-picture', async (req: Request, res: Response) => {
  try {
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    const standings = await MaddenDB.getLatestStandings(league_id as string);
    
    // Separate by conference
    const afcTeams = standings.filter(s => s.conferenceName.toLowerCase() === 'afc')
      .sort((a, b) => a.rank - b.rank);
    const nfcTeams = standings.filter(s => s.conferenceName.toLowerCase() === 'nfc')
      .sort((a, b) => a.rank - b.rank);

    // Determine playoff status (simplified logic)
    const getPlayoffStatus = (teams: Standing[]) => {
      const clinched = teams.slice(0, 7); // Top 7 teams make playoffs
      const inHunt = teams.slice(7, 12); // Next 5 teams still in hunt
      const eliminated = teams.slice(12); // Bottom teams eliminated

      return { clinched, inHunt, eliminated };
    };

    const playoffPicture: PlayoffPicture = {
      afc: getPlayoffStatus(afcTeams),
      nfc: getPlayoffStatus(nfcTeams)
    };

    res.json({
      playoffPicture,
      lastUpdated: new Date(),
      note: 'Playoff picture is simplified and may not reflect actual NFL playoff rules'
    });
  } catch (error) {
    console.error('Error fetching playoff picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/standings/team/:teamId - Get specific team's standing
router.get('/team/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    const teamIdNum = parseInt(teamId);
    if (isNaN(teamIdNum)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const standing = await MaddenDB.getStandingForTeam(league_id as string, teamIdNum);
    
    // Get all standings to determine division/conference rankings
    const allStandings = await MaddenDB.getLatestStandings(league_id as string);
    
    const divisionTeams = allStandings.filter(s => s.divisonName === standing.divisonName)
      .sort((a, b) => a.rank - b.rank);
    const conferenceTeams = allStandings.filter(s => s.conferenceName === standing.conferenceName)
      .sort((a, b) => a.rank - b.rank);

    const divisionRank = divisionTeams.findIndex(s => s.teamId === teamIdNum) + 1;
    const conferenceRank = conferenceTeams.findIndex(s => s.teamId === teamIdNum) + 1;

    res.json({
      standing: {
        ...standing,
        divisionRank,
        conferenceRank,
        record: formatRecord(standing)
      },
      division: {
        name: standing.divisonName,
        rank: divisionRank,
        teams: divisionTeams.length
      },
      conference: {
        name: standing.conferenceName,
        rank: conferenceRank,
        teams: conferenceTeams.length
      }
    });
  } catch (error) {
    console.error('Error fetching team standing:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Team standing not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/standings/history/:week/:season - Get historical standings
router.get('/history/:week/:season', async (req: Request, res: Response) => {
  try {
    const { week, season } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // This would require implementing historical standings storage
    // For now, return current standings as placeholder
    const standings = await MaddenDB.getLatestStandings(league_id as string);

    res.json({
      week: parseInt(week),
      season: parseInt(season),
      standings: standings.sort((a, b) => a.rank - b.rank),
      note: 'Historical standings not yet implemented - showing current standings'
    });
  } catch (error) {
    console.error('Error fetching historical standings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;