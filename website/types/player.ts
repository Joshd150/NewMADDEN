// Player type definitions for the website
export interface Player {
  // Core identification
  rosterId: number;
  firstName: string;
  lastName: string;
  position: string;
  teamId: number;
  
  // Ratings
  playerBestOvr: number;
  speedRating?: number;
  strengthRating?: number;
  agilityRating?: number;
  awareRating?: number;
  throwPowerRating?: number;
  throwAccRating?: number;
  catchRating?: number;
  carryRating?: number;
  
  // Physical attributes
  age?: number;
  height?: number;
  weight?: number;
  yearsPro?: number;
  
  // Development and traits
  devTrait?: number; // 0=Normal, 1=Star, 2=Superstar, 3=X-Factor
  
  // Contract information
  contractSalary?: number;
  contractYearsLeft?: number;
  contractBonus?: number;
  
  // Metadata for website
  websiteSlug?: string;
  lastUpdated?: Date;
}

export interface PlayerStats {
  career: CareerStats;
  season: SeasonStats;
  weekly: WeeklyStats[];
}

export interface CareerStats {
  gamesPlayed: number;
  // Position-specific stats would be added here
  [key: string]: any;
}

export interface SeasonStats {
  gamesPlayed: number;
  // Position-specific stats would be added here
  [key: string]: any;
}

export interface WeeklyStats {
  week: number;
  season: number;
  // Position-specific stats would be added here
  [key: string]: any;
}

export interface PlayerComparison {
  players: Player[];
  comparison: {
    ratings: ComparisonData;
    stats: ComparisonData;
    contracts: ComparisonData;
  };
}

export interface ComparisonData {
  [category: string]: {
    playerId: number;
    value: number | string;
  }[];
}