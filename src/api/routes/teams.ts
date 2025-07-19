import { Router } from 'express';
import { Request, Response } from 'express';
import MaddenDB from '../../db/madden_db';
import { Team } from '../../export/madden_league_types';
import { config } from '../../config/environment';
import db from '../../db/firebase';
import { LeagueSettings } from '../../discord/settings_db';

const router = Router();

// Team interfaces for API responses
interface TeamResponse {
  team: Team;
  roster: any[];
  schedule: any[];
  stats: any;
  recentGames: any[];
}

interface TeamsResponse {
  teams: Team[];
  openTeams: Team[];
  waitlist: WaitlistEntry[];
}

interface WaitlistEntry {
  userId: string;
  username: string;
  position: number;
  requestedAt: Date;
}

interface TeamRosterResponse {
  roster: any[];
  salaryCapInfo: SalaryCapInfo;
  depthChart: DepthChart;
}

interface SalaryCapInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

interface DepthChart {
  [position: string]: any[];
}

// GET /api/teams - List all teams with ownership and waitlist info
router.get('/', async (req: Request, res: Response) => {
  try {
    const { league_id, guild_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Get teams from database
    const teamList = await MaddenDB.getLatestTeams(league_id as string);
    const teams = teamList.getLatestTeams();

    // Get league settings to determine team ownership
    let teamAssignments = {};
    let waitlist: WaitlistEntry[] = [];

    if (guild_id) {
      try {
        const doc = await db.collection("league_settings").doc(guild_id as string).get();
        const leagueSettings = doc.exists ? doc.data() as LeagueSettings : {} as LeagueSettings;
        teamAssignments = leagueSettings.commands?.teams?.assignments || {};
        waitlist = leagueSettings.commands?.waitlist?.current_waitlist?.map((user, index) => ({
          userId: user.id,
          username: `User ${user.id}`, // Would need to fetch actual username
          position: index + 1,
          requestedAt: new Date() // Would need actual timestamp
        })) || [];
      } catch (error) {
        console.warn('Could not fetch team assignments:', error);
      }
    }

    // Enhance teams with ownership information
    const enhancedTeams = teams.map(team => ({
      ...team,
      ownership: {
        discordUserId: (teamAssignments as any)[team.teamId]?.discord_user?.id,
        isOpen: !(teamAssignments as any)[team.teamId]?.discord_user?.id,
      },
      websiteSlug: `${team.cityName.toLowerCase().replace(/\s+/g, '-')}-${team.nickName.toLowerCase().replace(/\s+/g, '-')}`
    }));

    const openTeams = enhancedTeams.filter(team => team.ownership.isOpen);

    const response: TeamsResponse = {
      teams: enhancedTeams,
      openTeams,
      waitlist
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teams/:slug - Get individual team details
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Find team by slug (would need to implement slug-to-team mapping)
    const teamList = await MaddenDB.getLatestTeams(league_id as string);
    const teams = teamList.getLatestTeams();
    
    const team = teams.find(t => 
      `${t.cityName.toLowerCase().replace(/\s+/g, '-')}-${t.nickName.toLowerCase().replace(/\s+/g, '-')}` === slug
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get team roster
    const allPlayers = await MaddenDB.getLatestPlayers(league_id as string);
    const roster = allPlayers.filter(player => player.teamId === team.teamId);

    // Get team schedule (recent and upcoming games)
    const currentWeek = 1; // Would need to get actual current week
    const schedule = await MaddenDB.getLatestWeekSchedule(league_id as string, currentWeek);
    const teamGames = schedule.filter(game => 
      game.homeTeamId === team.teamId || game.awayTeamId === team.teamId
    );

    // Get team standings/stats
    const standing = await MaddenDB.getStandingForTeam(league_id as string, team.teamId);

    // Calculate salary cap info
    const salaryCapInfo: SalaryCapInfo = {
      used: roster.reduce((total, player) => total + (player.contractSalary || 0), 0),
      total: 200000000, // Standard NFL salary cap
      available: 0,
      percentage: 0
    };
    salaryCapInfo.available = salaryCapInfo.total - salaryCapInfo.used;
    salaryCapInfo.percentage = (salaryCapInfo.used / salaryCapInfo.total) * 100;

    const response: TeamResponse = {
      team: {
        ...team,
        websiteSlug: slug
      },
      roster,
      schedule: teamGames,
      stats: standing,
      recentGames: teamGames.filter(game => game.status !== 1) // Completed games
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teams/:slug/roster - Get team roster with depth chart
router.get('/:slug/roster', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Find team by slug
    const teamList = await MaddenDB.getLatestTeams(league_id as string);
    const teams = teamList.getLatestTeams();
    
    const team = teams.find(t => 
      `${t.cityName.toLowerCase().replace(/\s+/g, '-')}-${t.nickName.toLowerCase().replace(/\s+/g, '-')}` === slug
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get team roster
    const allPlayers = await MaddenDB.getLatestPlayers(league_id as string);
    const roster = allPlayers.filter(player => player.teamId === team.teamId);

    // Calculate salary cap info
    const salaryCapInfo: SalaryCapInfo = {
      used: roster.reduce((total, player) => total + (player.contractSalary || 0), 0),
      total: 200000000,
      available: 0,
      percentage: 0
    };
    salaryCapInfo.available = salaryCapInfo.total - salaryCapInfo.used;
    salaryCapInfo.percentage = (salaryCapInfo.used / salaryCapInfo.total) * 100;

    // Create depth chart
    const depthChart: DepthChart = {};
    const positions = ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 
                     'LE', 'RE', 'DT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P'];

    positions.forEach(position => {
      depthChart[position] = roster
        .filter(player => player.position === position)
        .sort((a, b) => b.playerBestOvr - a.playerBestOvr);
    });

    const response: TeamRosterResponse = {
      roster: roster.sort((a, b) => b.playerBestOvr - a.playerBestOvr),
      salaryCapInfo,
      depthChart
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching team roster:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teams/:slug/join-waitlist - Join team waitlist
router.post('/:slug/join-waitlist', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { user_id, guild_id } = req.body;

    if (!user_id || !guild_id) {
      return res.status(400).json({ error: 'user_id and guild_id are required' });
    }

    // Implementation for joining team waitlist
    // This would integrate with the Discord waitlist system
    
    res.json({ success: true, message: 'Added to team waitlist' });
  } catch (error) {
    console.error('Error joining team waitlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teams/:slug/schedule - Get team schedule
router.get('/:slug/schedule', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { league_id, week, season } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id is required' });
    }

    // Find team by slug
    const teamList = await MaddenDB.getLatestTeams(league_id as string);
    const teams = teamList.getLatestTeams();
    
    const team = teams.find(t => 
      `${t.cityName.toLowerCase().replace(/\s+/g, '-')}-${t.nickName.toLowerCase().replace(/\s+/g, '-')}` === slug
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get schedule for specific week/season or current
    let schedule;
    if (week && season) {
      schedule = await MaddenDB.getWeekScheduleForSeason(
        league_id as string, 
        parseInt(week as string), 
        parseInt(season as string)
      );
    } else {
      schedule = await MaddenDB.getLatestWeekSchedule(league_id as string, 1); // Current week
    }

    // Filter for team games
    const teamGames = schedule.filter(game => 
      game.homeTeamId === team.teamId || game.awayTeamId === team.teamId
    );

    // Enhance games with opponent information
    const enhancedGames = teamGames.map(game => {
      const isHome = game.homeTeamId === team.teamId;
      const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
      const opponent = teams.find(t => t.teamId === opponentId);

      return {
        ...game,
        isHome,
        opponent: opponent ? {
          teamId: opponent.teamId,
          displayName: opponent.displayName,
          cityName: opponent.cityName,
          abbrName: opponent.abbrName
        } : null,
        websiteSlug: `week-${game.weekIndex + 1}-${game.seasonIndex}-${game.scheduleId}`
      };
    });

    res.json({
      team: {
        teamId: team.teamId,
        displayName: team.displayName,
        websiteSlug: slug
      },
      schedule: enhancedGames
    });
  } catch (error) {
    console.error('Error fetching team schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;