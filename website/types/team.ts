// Team type definitions for the website
export interface Team {
  // Core identification
  teamId: number;
  cityName: string;
  displayName: string;
  abbrName: string;
  nickName: string;
  
  // Visual
  logoUrl?: string;
  primaryColor?: number;
  secondaryColor?: number;
  
  // Ownership information
  ownership?: {
    discordUserId?: string;
    discordUsername?: string;
    isOpen: boolean;
    waitlistPosition?: number;
  };
  
  // Roster information
  roster?: {
    players: number[]; // Player roster IDs
    salary_cap: {
      used: number;
      available: number;
      total: number;
    };
  };
  
  // Team statistics
  statistics?: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
    divisionRank: number;
    conferenceRank: number;
  };
  
  // Metadata for website
  websiteSlug?: string;
  lastUpdated?: Date;
}

export interface TeamRoster {
  roster: any[];
  salaryCapInfo: SalaryCapInfo;
  depthChart: DepthChart;
}

export interface SalaryCapInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export interface DepthChart {
  [position: string]: any[];
}

export interface WaitlistEntry {
  userId: string;
  username: string;
  position: number;
  requestedAt: Date;
}