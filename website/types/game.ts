// Game type definitions for the website
export interface Game {
  // Core identification
  scheduleId: number;
  weekIndex: number;
  seasonIndex: number;
  
  // Teams and scores
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  
  // Game status
  status: GameResult;
  
  // Enhanced game information
  gameDetails?: {
    quarter: number;
    timeRemaining: string;
    weather?: string;
    attendance?: number;
  };
  
  // Team statistics for this game
  teamStats?: {
    [teamId: number]: TeamGameStats;
  };
  
  // Player statistics for this game
  playerStats?: {
    [rosterId: number]: PlayerGameStats;
  };
  
  // Metadata
  playedAt?: Date;
  websiteSlug?: string;
  
  // Enhanced fields for website display
  homeTeam?: any;
  awayTeam?: any;
  statusText?: string;
}

export enum GameResult {
  NOT_PLAYED = 1,
  AWAY_WIN = 2,
  HOME_WIN = 3,
  TIE = 4
}

export interface TeamGameStats {
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

export interface PlayerGameStats {
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

export interface BoxScore {
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

export interface Schedule {
  games: Game[];
  currentWeek: number;
  currentSeason: number;
  weekTitle: string;
}