import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from '../config/environment';

// Import route handlers
import playersRouter from './routes/players';
import teamsRouter from './routes/teams';
import gamesRouter from './routes/games';
import standingsRouter from './routes/standings';

// Import existing database listeners
import MaddenDB from '../db/madden_db';
import EventDB from '../db/events_db';
import { MaddenGame, Player, Team, Standing } from '../export/madden_league_types';

class APIServer {
  private app: express.Application;
  private server: any;
  private io: Server;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.security.corsOrigin,
        credentials: config.security.corsCredentials
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupDatabaseListeners();
  }

  private setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: config.security.corsCredentials
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.maxRequests,
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      if (config.development.logLevel === 'debug') {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      }
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: config.discord.version
      });
    });

    // API routes
    this.app.use('/api/players', playersRouter);
    this.app.use('/api/teams', teamsRouter);
    this.app.use('/api/games', gamesRouter);
    this.app.use('/api/standings', standingsRouter);

    // 404 handler
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('API Error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        ...(config.development.nodeEnv === 'development' && { details: error.message })
      });
    });
  }

  private setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Join league rooms
      socket.on('join-league', (leagueId: string) => {
        socket.join(`league:${leagueId}`);
        console.log(`📡 Client ${socket.id} joined league: ${leagueId}`);
      });

      // Leave league rooms
      socket.on('leave-league', (leagueId: string) => {
        socket.leave(`league:${leagueId}`);
        console.log(`📡 Client ${socket.id} left league: ${leagueId}`);
      });

      // Join player rooms for specific player updates
      socket.on('watch-player', (playerId: string) => {
        socket.join(`player:${playerId}`);
        console.log(`👤 Client ${socket.id} watching player: ${playerId}`);
      });

      // Join team rooms for specific team updates
      socket.on('watch-team', (teamId: string) => {
        socket.join(`team:${teamId}`);
        console.log(`🏟️ Client ${socket.id} watching team: ${teamId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupDatabaseListeners() {
    // Listen for player updates
    MaddenDB.on<Player>('MADDEN_PLAYER', (players) => {
      players.forEach(player => {
        // Emit to league room
        this.io.to(`league:${player.key}`).emit('player:updated', {
          playerId: player.rosterId,
          changes: player,
          timestamp: new Date()
        });

        // Emit to specific player watchers
        this.io.to(`player:${player.rosterId}`).emit('player:detailed_update', {
          player,
          timestamp: new Date()
        });

        // Check for rating changes
        this.checkForRatingChange(player);
      });
    });

    // Listen for game updates
    MaddenDB.on<MaddenGame>('MADDEN_SCHEDULE', (games) => {
      games.forEach(game => {
        // Emit to league room
        this.io.to(`league:${game.key}`).emit('game:updated', {
          gameId: game.scheduleId,
          game,
          timestamp: new Date()
        });

        // If game is completed, emit special event
        if (game.status !== 1) { // NOT_PLAYED = 1
          this.io.to(`league:${game.key}`).emit('game:completed', {
            gameId: game.scheduleId,
            finalScore: {
              home: game.homeScore,
              away: game.awayScore
            },
            homeTeamId: game.homeTeamId,
            awayTeamId: game.awayTeamId,
            timestamp: new Date()
          });

          // Emit to team watchers
          this.io.to(`team:${game.homeTeamId}`).emit('team:game_completed', {
            game,
            isHome: true,
            timestamp: new Date()
          });

          this.io.to(`team:${game.awayTeamId}`).emit('team:game_completed', {
            game,
            isHome: false,
            timestamp: new Date()
          });
        }
      });
    });

    // Listen for team updates
    MaddenDB.on<Team>('MADDEN_TEAM', (teams) => {
      teams.forEach(team => {
        this.io.to(`league:${team.key}`).emit('team:updated', {
          teamId: team.teamId,
          changes: team,
          timestamp: new Date()
        });

        this.io.to(`team:${team.teamId}`).emit('team:detailed_update', {
          team,
          timestamp: new Date()
        });
      });
    });

    // Listen for standings updates
    MaddenDB.on<Standing>('MADDEN_STANDING', (standings) => {
      const leagueId = standings[0]?.key;
      if (leagueId) {
        this.io.to(`league:${leagueId}`).emit('standings:updated', {
          standings,
          timestamp: new Date()
        });
      }
    });
  }

  private async checkForRatingChange(player: Player) {
    // This would implement logic to detect rating changes
    // by comparing with previous player data
    // For now, it's a placeholder
    
    // Example: If we had previous rating stored
    // const previousRating = await getPreviousRating(player.rosterId);
    // if (previousRating && previousRating !== player.playerBestOvr) {
    //   this.io.to(`league:${player.key}`).emit('player:rating_change', {
    //     playerId: player.rosterId,
    //     oldRating: previousRating,
    //     newRating: player.playerBestOvr,
    //     change: player.playerBestOvr - previousRating,
    //     timestamp: new Date()
    //   });
    // }
  }

  public start() {
    const port = config.website.port;
    
    this.server.listen(port, () => {
      console.log(`🚀 API Server running on port ${port}`);
      console.log(`🌐 CORS enabled for: ${config.security.corsOrigin.join(', ')}`);
      console.log(`📡 WebSocket server ready`);
      
      if (config.development.nodeEnv === 'development') {
        console.log(`📋 API Documentation: http://localhost:${port}/api/health`);
      }
    });
  }

  public getApp() {
    return this.app;
  }

  public getIO() {
    return this.io;
  }
}

// Export singleton instance
export const apiServer = new APIServer();

// Start server if this file is run directly
if (require.main === module) {
  apiServer.start();
}

export default apiServer;