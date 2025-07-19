# VFL Manager - Comprehensive Technical Specification

## Executive Summary

This document outlines the complete technical specification for VFL Manager, a comprehensive sports league management system with seamless Discord bot integration. The system will provide detailed player management, team oversight, schedule tracking, and real-time statistics while maintaining full synchronization between the website and Discord bot.

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │◄──►│   API Gateway   │◄──►│     Website     │
│  (VFL Manager)  │    │   (Express.js)  │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firestore Database                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Players   │ │    Teams    │ │   Games     │ │  Settings   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
         ▲
         │
         ▼
┌─────────────────┐
│   EA Servers    │
│  (Madden API)   │
└─────────────────┘
```

### Technology Stack

#### Backend
- **Runtime**: Node.js 21+ with TypeScript
- **Database**: Firestore (existing, enhanced)
- **API Framework**: Express.js with Koa.js (preserve existing)
- **Real-time**: Socket.io for live updates
- **Authentication**: Discord OAuth2 + EA API tokens

#### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom Madden theme
- **UI Components**: Radix UI + custom components
- **Charts**: Chart.js/Recharts for statistics
- **State Management**: Zustand for client state

#### Discord Bot
- **Library**: discord.js v14 (upgrade from existing)
- **Commands**: Slash commands with autocomplete
- **Interactions**: Buttons, select menus, modals
- **Embeds**: Rich embeds with Madden 26 theming

## Database Schema Design

### Enhanced Firestore Collections

#### Players Collection
```typescript
interface Player {
  // Existing fields preserved
  rosterId: number;
  firstName: string;
  lastName: string;
  position: string;
  teamId: number;
  playerBestOvr: number;
  
  // Enhanced fields
  ratings: {
    speed: number;
    acceleration: number;
    strength: number;
    agility: number;
    awareness: number;
    // ... all Madden ratings
  };
  
  traits: {
    development: 'Normal' | 'Star' | 'Superstar' | 'X-Factor';
    personality: string[];
    playStyle: string;
  };
  
  statistics: {
    career: CareerStats;
    season: SeasonStats;
    weekly: WeeklyStats[];
  };
  
  contract: {
    salary: number;
    yearsLeft: number;
    bonus: number;
  };
  
  // Metadata
  lastUpdated: Date;
  websiteSlug: string; // For SEO-friendly URLs
}
```

#### Teams Collection
```typescript
interface Team {
  // Existing fields preserved
  teamId: number;
  cityName: string;
  displayName: string;
  abbrName: string;
  
  // Enhanced fields
  ownership: {
    discordUserId?: string;
    discordUsername?: string;
    isOpen: boolean;
    waitlistPosition?: number;
  };
  
  roster: {
    players: number[]; // Player roster IDs
    salary_cap: {
      used: number;
      available: number;
      total: number;
    };
  };
  
  statistics: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
    divisionRank: number;
    conferenceRank: number;
  };
  
  // Metadata
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  websiteSlug: string;
}
```

#### Games Collection
```typescript
interface Game {
  // Existing fields preserved
  scheduleId: number;
  weekIndex: number;
  seasonIndex: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  status: GameResult;
  
  // Enhanced fields
  gameDetails: {
    quarter: number;
    timeRemaining: string;
    weather?: string;
    attendance?: number;
  };
  
  teamStats: {
    [teamId: number]: {
      totalYards: number;
      passingYards: number;
      rushingYards: number;
      turnovers: number;
      penalties: number;
      timeOfPossession: string;
    };
  };
  
  playerStats: {
    [rosterId: number]: {
      passing?: PassingStats;
      rushing?: RushingStats;
      receiving?: ReceivingStats;
      defense?: DefensiveStats;
      kicking?: KickingStats;
    };
  };
  
  // Metadata
  playedAt?: Date;
  websiteSlug: string;
}
```

#### League Settings (Enhanced)
```typescript
interface LeagueSettings {
  // Existing settings preserved
  commands: ExistingCommands;
  
  // New VFL Manager settings
  vfl: {
    website: {
      enabled: boolean;
      customDomain?: string;
      theme: 'madden26' | 'classic';
    };
    
    channels: {
      playerUpdates: string;
      gameResults: string;
      trades: string;
      commissioners: string;
      ratingChanges: string;
      waiverClaims: string;
      rosterMoves: string;
      announcements: string;
    };
    
    features: {
      playerComparison: boolean;
      advancedStats: boolean;
      tradeApproval: boolean;
      waitlistIntegration: boolean;
    };
    
    notifications: {
      [key: string]: boolean;
    };
  };
}
```

## API Endpoints Specification

### RESTful API Design

#### Player Endpoints
```typescript
// GET /api/players
// Query parameters: team, position, rating_min, rating_max, limit, offset
interface PlayersResponse {
  players: Player[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

// GET /api/players/:slug
interface PlayerResponse {
  player: Player;
  stats: {
    career: CareerStats;
    season: SeasonStats;
    recentGames: GameStats[];
  };
  team: Team;
  comparisons?: Player[]; // Similar players
}

// GET /api/players/compare
// Query: player1, player2, player3 (up to 4 players)
interface PlayerComparisonResponse {
  players: Player[];
  comparison: {
    ratings: ComparisonData;
    stats: ComparisonData;
    contracts: ComparisonData;
  };
}
```

#### Team Endpoints
```typescript
// GET /api/teams
interface TeamsResponse {
  teams: Team[];
  openTeams: Team[];
  waitlist: WaitlistEntry[];
}

// GET /api/teams/:slug
interface TeamResponse {
  team: Team;
  roster: Player[];
  schedule: Game[];
  stats: TeamStats;
  recentGames: Game[];
}

// GET /api/teams/:slug/roster
interface TeamRosterResponse {
  roster: Player[];
  salaryCapInfo: SalaryCapInfo;
  depthChart: DepthChart;
}
```

#### Schedule & Games Endpoints
```typescript
// GET /api/schedule
// Query: week, season, team
interface ScheduleResponse {
  games: Game[];
  currentWeek: number;
  currentSeason: number;
}

// GET /api/games/:slug
interface GameResponse {
  game: Game;
  homeTeam: Team;
  awayTeam: Team;
  boxScore: BoxScore;
  playerStats: PlayerGameStats[];
}

// GET /api/standings
interface StandingsResponse {
  standings: Standing[];
  divisions: {
    [division: string]: Standing[];
  };
  conferences: {
    [conference: string]: Standing[];
  };
  history: WeeklyStandings[];
}
```

#### Real-time WebSocket Events
```typescript
interface WebSocketEvents {
  // Player updates
  'player:updated': { playerId: number; changes: Partial<Player> };
  'player:rating_change': { playerId: number; oldRating: number; newRating: number };
  
  // Game updates
  'game:completed': { gameId: number; finalScore: GameScore };
  'game:in_progress': { gameId: number; currentScore: GameScore; quarter: number };
  
  // Team updates
  'team:roster_change': { teamId: number; change: RosterChange };
  'team:ownership_change': { teamId: number; newOwner?: string };
  
  // League updates
  'league:trade_proposed': { trade: Trade };
  'league:waiver_claim': { claim: WaiverClaim };
  'league:standings_update': { standings: Standing[] };
}
```

## User Interface Design

### Page Layouts and Components

#### Player Profile Page
```typescript
// /players/[slug]
interface PlayerPageProps {
  player: Player;
  stats: PlayerStats;
  team: Team;
  similarPlayers: Player[];
}

// Key Components:
// - PlayerHeader (name, position, team, overall rating)
// - RatingChart (visual rating display with color coding)
// - StatsTabs (career, season, game-by-game)
// - DevelopmentTracker (trait progression)
// - ContractInfo (salary, years remaining)
// - SimilarPlayers (comparison suggestions)
```

#### Player Comparison Tool
```typescript
// /players/compare?players=player1,player2,player3
interface ComparisonPageProps {
  players: Player[];
  comparisonData: ComparisonMatrix;
}

// Key Components:
// - PlayerSelector (search and add players)
// - ComparisonTable (side-by-side stats)
// - RatingRadar (visual rating comparison)
// - StatCharts (performance graphs)
// - ExportOptions (share comparison)
```

#### Team Management Page
```typescript
// /teams/[slug]
interface TeamPageProps {
  team: Team;
  roster: Player[];
  schedule: Game[];
  stats: TeamStats;
}

// Key Components:
// - TeamHeader (logo, name, record, owner)
// - RosterTable (sortable player list)
// - DepthChart (positional organization)
// - SalaryCapTracker (financial overview)
// - ScheduleWidget (upcoming/recent games)
// - TeamStats (performance metrics)
```

#### Schedule & Results Page
```typescript
// /schedule
interface SchedulePageProps {
  games: Game[];
  currentWeek: number;
  standings: Standing[];
}

// Key Components:
// - WeekSelector (navigate between weeks)
// - GameCards (clickable game results)
// - StandingsWidget (current rankings)
// - PlayoffPicture (postseason scenarios)
```

### Visual Design System

#### Color Coding for Ratings
```css
/* Rating Color System */
.rating-excellent { color: #10B981; } /* 90+ OVR - Green */
.rating-good { color: #F59E0B; }      /* 80-89 OVR - Yellow */
.rating-average { color: #FF6B35; }   /* 70-79 OVR - Orange */
.rating-poor { color: #EF4444; }      /* <70 OVR - Red */

/* Development Traits */
.trait-xfactor { color: #8B5CF6; }    /* X-Factor - Purple */
.trait-superstar { color: #F59E0B; }  /* Superstar - Gold */
.trait-star { color: #3B82F6; }       /* Star - Blue */
.trait-normal { color: #6B7280; }     /* Normal - Gray */
```

#### Component Library
```typescript
// Reusable UI Components
interface UIComponents {
  PlayerCard: React.FC<{ player: Player; compact?: boolean }>;
  TeamLogo: React.FC<{ team: Team; size: 'sm' | 'md' | 'lg' }>;
  RatingBar: React.FC<{ rating: number; maxRating: number }>;
  StatChart: React.FC<{ data: ChartData; type: 'line' | 'bar' | 'radar' }>;
  GameScore: React.FC<{ game: Game; clickable?: boolean }>;
  StandingsTable: React.FC<{ standings: Standing[]; interactive?: boolean }>;
}
```

## Discord Bot Enhancement Plan

### Enhanced Command Structure

#### Player Commands
```typescript
// /player <name> - Display player card with website link
// /player compare <player1> <player2> - Quick comparison
// /player search <criteria> - Search players by position, team, rating
// /player watch <name> - Get notifications for player updates

interface PlayerCommands {
  player: {
    subcommands: ['info', 'compare', 'search', 'watch', 'stats'];
    autocomplete: true; // Player name autocomplete
    websiteIntegration: true; // Links to website player pages
  };
}
```

#### Team Commands
```typescript
// /team <name> - Display team overview with roster link
// /team roster <name> - Show team roster in Discord
// /team schedule <name> - Show team schedule
// /team claim <name> - Join waitlist for open team

interface TeamCommands {
  team: {
    subcommands: ['info', 'roster', 'schedule', 'claim', 'stats'];
    waitlistIntegration: true;
    websiteLinks: true;
  };
}
```

#### Enhanced Game Commands
```typescript
// /game <week> [team] - Show games for week
// /game result <game_id> - Detailed game result
// /game watch <team> - Get notifications for team games

interface GameCommands {
  game: {
    subcommands: ['schedule', 'result', 'watch', 'simulate'];
    realTimeUpdates: true;
    detailedStats: true;
  };
}
```

### Interactive Discord Features

#### Rich Embeds with Website Links
```typescript
interface DiscordEmbeds {
  playerCard: {
    thumbnail: string; // Player headshot
    fields: PlayerField[];
    footer: { text: 'View full profile at maddenvfl.com/players/[slug]' };
    buttons: [
      { label: 'View Profile', url: 'website_link', style: 'Link' },
      { label: 'Compare', customId: 'compare_player', style: 'Secondary' }
    ];
  };
  
  gameResult: {
    title: string; // Team A vs Team B - Final
    description: string; // Score and key stats
    fields: GameStatField[];
    footer: { text: 'View detailed box score at maddenvfl.com/games/[slug]' };
  };
}
```

#### Button Interactions
```typescript
interface ButtonInteractions {
  'compare_player': (playerId: string) => void;
  'view_roster': (teamId: string) => void;
  'join_waitlist': (teamId: string) => void;
  'refresh_stats': (type: string) => void;
}
```

## Real-time Synchronization

### WebSocket Implementation

#### Server-side (Express.js + Socket.io)
```typescript
// src/websocket/server.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

class WebSocketServer {
  private io: Server;
  
  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: { origin: process.env.WEBSITE_URL }
    });
    
    this.setupEventHandlers();
    this.setupDatabaseListeners();
  }
  
  private setupDatabaseListeners() {
    // Listen to Firestore changes
    MaddenDB.on('MADDEN_PLAYER', (players) => {
      players.forEach(player => {
        this.io.emit('player:updated', {
          playerId: player.rosterId,
          changes: player
        });
      });
    });
    
    MaddenDB.on('MADDEN_SCHEDULE', (games) => {
      games.forEach(game => {
        if (game.status !== GameResult.NOT_PLAYED) {
          this.io.emit('game:completed', {
            gameId: game.scheduleId,
            finalScore: {
              home: game.homeScore,
              away: game.awayScore
            }
          });
        }
      });
    });
  }
}
```

#### Client-side (Next.js)
```typescript
// hooks/useRealTimeData.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useRealTimeData<T>(
  eventName: string,
  initialData: T
): [T, boolean] {
  const [data, setData] = useState<T>(initialData);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL!);
    
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    
    socket.on(eventName, (newData: T) => {
      setData(newData);
    });
    
    return () => socket.disconnect();
  }, [eventName]);
  
  return [data, connected];
}
```

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up enhanced database schema
- [ ] Create configuration system with .env
- [ ] Implement basic API endpoints
- [ ] Set up Next.js website structure
- [ ] Preserve existing EA integration

### Phase 2: Core Features (Weeks 3-4)
- [ ] Player profile pages and API
- [ ] Team management system
- [ ] Enhanced Discord commands
- [ ] Real-time synchronization
- [ ] Basic website navigation

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Player comparison tool
- [ ] Schedule and game details
- [ ] Standings with history
- [ ] Discord bot interactive features
- [ ] Mobile optimization

### Phase 4: Integration & Polish (Weeks 7-8)
- [ ] Discord-website hyperlink integration
- [ ] Advanced analytics
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation completion

### Phase 5: Deployment & Launch (Week 9)
- [ ] Production deployment
- [ ] Domain configuration
- [ ] Monitoring setup
- [ ] User training
- [ ] Gradual rollout

## Environment Configuration

### Complete .env Structure
```env
# Database Configuration
FIRESTORE_EMULATOR_HOST=localhost:8080  # For development
SERVICE_ACCOUNT_FILE=path/to/service-account.json
SERVICE_ACCOUNT={"type":"service_account",...}  # For production

# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
PUBLIC_KEY=your_discord_public_key
APP_ID=your_discord_application_id

# EA API Configuration (Preserve existing)
DEPLOYMENT_URL=your_deployment_url

# Website Configuration
NEXT_PUBLIC_SITE_URL=https://maddenvfl.com
NEXT_PUBLIC_API_URL=https://api.maddenvfl.com
NEXT_PUBLIC_BOT_INVITE_URL=https://discord.com/oauth2/authorize?client_id=...

# Real-time Configuration
WEBSOCKET_PORT=3001
REDIS_URL=redis://localhost:6379  # For scaling

# Security
JWT_SECRET=your_jwt_secret_for_api_auth
CORS_ORIGIN=https://maddenvfl.com

# Analytics (Optional)
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
SENTRY_DSN=your_sentry_dsn_for_error_tracking

# Development
NODE_ENV=development|production
LOG_LEVEL=debug|info|warn|error
```

## Testing Strategy

### Unit Testing
```typescript
// Player API tests
describe('Player API', () => {
  test('GET /api/players/:slug returns player data', async () => {
    const response = await request(app)
      .get('/api/players/tom-brady')
      .expect(200);
    
    expect(response.body.player.firstName).toBe('Tom');
    expect(response.body.player.lastName).toBe('Brady');
  });
});

// Discord command tests
describe('Player Commands', () => {
  test('/player command returns player embed', async () => {
    const interaction = mockInteraction('/player', { name: 'Tom Brady' });
    await PlayerCommand.execute(interaction, mockClient);
    
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining('Tom Brady')
        })
      ])
    });
  });
});
```

### Integration Testing
```typescript
// Real-time synchronization tests
describe('Real-time Sync', () => {
  test('Player update triggers website refresh', async () => {
    const mockSocket = new MockSocket();
    const player = await updatePlayer(testPlayerId, { playerBestOvr: 95 });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('player:updated', {
      playerId: testPlayerId,
      changes: expect.objectContaining({ playerBestOvr: 95 })
    });
  });
});
```

## Security Considerations

### API Security
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Authentication middleware
const authenticateDiscordUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const user = await verifyDiscordToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Data Validation
```typescript
// Input validation schemas
import Joi from 'joi';

const playerUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  position: Joi.string().valid(...VALID_POSITIONS),
  playerBestOvr: Joi.number().min(40).max(99)
});
```

## Performance Optimization

### Caching Strategy
```typescript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const cachePlayer = async (playerId: string, player: Player) => {
  await redis.setex(`player:${playerId}`, 300, JSON.stringify(player)); // 5 min cache
};

const getCachedPlayer = async (playerId: string): Promise<Player | null> => {
  const cached = await redis.get(`player:${playerId}`);
  return cached ? JSON.parse(cached) : null;
};
```

### Database Optimization
```typescript
// Firestore query optimization
const getPlayersOptimized = async (filters: PlayerFilters) => {
  let query = db.collection('league_data')
    .doc(leagueId)
    .collection('MADDEN_PLAYER');
  
  // Add compound indexes for common queries
  if (filters.position && filters.team) {
    query = query
      .where('position', '==', filters.position)
      .where('teamId', '==', filters.team)
      .orderBy('playerBestOvr', 'desc');
  }
  
  return query.limit(50).get();
};
```

## Monitoring and Analytics

### Application Monitoring
```typescript
// Performance monitoring
import { performance } from 'perf_hooks';

const monitorApiEndpoint = (endpoint: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    
    res.on('finish', () => {
      const duration = performance.now() - start;
      console.log(`${endpoint}: ${duration.toFixed(2)}ms`);
      
      // Send to monitoring service
      if (duration > 1000) {
        console.warn(`Slow endpoint: ${endpoint} took ${duration}ms`);
      }
    });
    
    next();
  };
};
```

### User Analytics
```typescript
// Track user interactions
const trackUserAction = async (action: string, userId: string, metadata?: any) => {
  await db.collection('analytics').add({
    action,
    userId,
    metadata,
    timestamp: new Date(),
    source: 'website' // or 'discord'
  });
};
```

This comprehensive specification provides a complete roadmap for transforming the existing snallabot into a professional VFL Manager system while preserving all existing EA integration logic and enhancing it with modern features and real-time capabilities.