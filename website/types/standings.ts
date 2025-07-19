// Standings type definitions for the website
export interface Standing {
  // Team identification
  teamId: number;
  teamName: string;
  
  // Record
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  winPct: number;
  
  // Division and conference
  divisonName: string; // Note: keeping original typo for compatibility
  conferenceName: string;
  rank: number;
  seed: number;
  
  // Scoring
  ptsFor: number;
  ptsAgainst: number;
  netPts: number;
  
  // Rankings
  ptsForRank: number;
  ptsAgainstRank: number;
  
  // Advanced stats
  offTotalYds: number;
  offTotalYdsRank: number;
  offPassYds: number;
  offPassYdsRank: number;
  offRushYds: number;
  offRushYdsRank: number;
  
  defTotalYds: number;
  defTotalYdsRank: number;
  defPassYds: number;
  defPassYdsRank: number;
  defRushYds: number;
  defRushYdsRank: number;
  
  // Other stats
  tODiff: number; // Turnover differential
  
  // Season info
  seasonIndex: number;
  weekIndex: number;
  calendarYear: number;
  
  // Playoff status
  playoffStatus: number;
  
  // Streaks
  winLossStreak: number;
  
  // Division/Conference records
  divWins: number;
  divLosses: number;
  divTies: number;
  confWins: number;
  confLosses: number;
  confTies: number;
  
  // Home/Away records
  homeWins: number;
  homeLosses: number;
  homeTies: number;
  awayWins: number;
  awayLosses: number;
  awayTies: number;
}

export interface StandingsResponse {
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

export interface WeeklyStandings {
  week: number;
  season: number;
  standings: Standing[];
  timestamp: Date;
}

export interface DivisionStandings {
  divisionName: string;
  conferenceName: string;
  teams: Standing[];
}

export interface PlayoffPicture {
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

// Helper function to format team records
export function formatRecord(standing: Standing): string {
  if (standing.totalTies === 0) {
    return `${standing.totalWins}-${standing.totalLosses}`;
  }
  return `${standing.totalWins}-${standing.totalLosses}-${standing.totalTies}`;
}