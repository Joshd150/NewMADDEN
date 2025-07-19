import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Environment validation schema
const envSchema = z.object({
  // Database Configuration
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  SERVICE_ACCOUNT_FILE: z.string().optional(),
  SERVICE_ACCOUNT: z.string().optional(),

  // Discord Bot Configuration
  DISCORD_TOKEN: z.string().min(1, 'Discord token is required'),
  PUBLIC_KEY: z.string().min(1, 'Discord public key is required'),
  APP_ID: z.string().min(1, 'Discord app ID is required'),
  BOT_NAME: z.string().default('VFL Manager'),
  BOT_VERSION: z.string().default('2.0.0'),

  // EA API Configuration
  DEPLOYMENT_URL: z.string().url('Valid deployment URL is required'),
  EA_API_TIMEOUT: z.string().transform(Number).default('30000'),
  EA_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),

  // Website Configuration
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://maddenvfl.com'),
  NEXT_PUBLIC_API_URL: z.string().url().default('https://api.maddenvfl.com'),
  WEBSITE_PORT: z.string().transform(Number).default('3000'),
  NEXT_PUBLIC_BOT_INVITE_URL: z.string().url().optional(),

  // Real-time Configuration
  WEBSOCKET_PORT: z.string().transform(Number).default('3001'),
  WEBSOCKET_CORS_ORIGIN: z.string().default('https://maddenvfl.com'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),

  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z.string().default('https://maddenvfl.com,http://localhost:3000'),
  CORS_CREDENTIALS: z.string().transform(Boolean).default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Analytics & Monitoring
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  NEW_RELIC_APP_NAME: z.string().default('VFL Manager'),

  // Development Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_SWAGGER: z.string().transform(Boolean).default('false'),
  ENABLE_DEBUG_ROUTES: z.string().transform(Boolean).default('false'),
  ENABLE_MOCK_DATA: z.string().transform(Boolean).default('false'),

  // Feature Flags
  VFL_ENABLE_TRADES: z.string().transform(Boolean).default('true'),
  VFL_ENABLE_COMMISSIONERS: z.string().transform(Boolean).default('true'),
  VFL_ENABLE_NOTIFICATIONS: z.string().transform(Boolean).default('true'),
  VFL_ENABLE_ANALYTICS: z.string().transform(Boolean).default('true'),
  VFL_ENABLE_PLAYER_COMPARISON: z.string().transform(Boolean).default('true'),
  VFL_ENABLE_WAITLIST: z.string().transform(Boolean).default('true'),

  // Discord Features
  DISCORD_ENABLE_SLASH_COMMANDS: z.string().transform(Boolean).default('true'),
  DISCORD_ENABLE_BUTTONS: z.string().transform(Boolean).default('true'),
  DISCORD_ENABLE_MODALS: z.string().transform(Boolean).default('true'),
  DISCORD_ENABLE_AUTOCOMPLETE: z.string().transform(Boolean).default('true'),

  // Website Features
  WEBSITE_ENABLE_REAL_TIME: z.string().transform(Boolean).default('true'),
  WEBSITE_ENABLE_DARK_MODE: z.string().transform(Boolean).default('true'),
  WEBSITE_ENABLE_MOBILE_APP: z.string().transform(Boolean).default('false'),

  // Third-party Integrations
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  TWITCH_SECRET: z.string().optional(),
  TWITCH_CALLBACK_URL: z.string().default('/twitch/webhook'),
  YOUTUBE_API_KEY: z.string().optional(),

  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('VFL Manager <noreply@maddenvfl.com>'),

  // Backup & Storage
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),
  BACKUP_ENABLED: z.string().transform(Boolean).default('false'),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default('30'),

  // Performance Tuning
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  DB_POOL_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),
  CACHE_TTL_PLAYERS: z.string().transform(Number).default('300'),
  CACHE_TTL_TEAMS: z.string().transform(Number).default('600'),
  CACHE_TTL_GAMES: z.string().transform(Number).default('60'),
  CACHE_TTL_STANDINGS: z.string().transform(Number).default('300'),

  // API Limits
  API_MAX_PLAYERS_PER_REQUEST: z.string().transform(Number).default('50'),
  API_MAX_GAMES_PER_REQUEST: z.string().transform(Number).default('100'),
  API_MAX_COMPARISON_PLAYERS: z.string().transform(Number).default('4'),

  // Testing Configuration
  TEST_DATABASE_URL: z.string().optional(),
  TEST_DISCORD_TOKEN: z.string().optional(),
  RUN_INTEGRATION_TESTS: z.string().transform(Boolean).default('false'),
  MOCK_EA_API: z.string().transform(Boolean).default('false'),
  MOCK_DISCORD_API: z.string().transform(Boolean).default('false'),
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  parseResult.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parseResult.data;

// Export typed environment configuration
export const config = {
  // Database
  database: {
    emulatorHost: env.FIRESTORE_EMULATOR_HOST,
    serviceAccountFile: env.SERVICE_ACCOUNT_FILE,
    serviceAccount: env.SERVICE_ACCOUNT,
  },

  // Discord Bot
  discord: {
    token: env.DISCORD_TOKEN,
    publicKey: env.PUBLIC_KEY,
    appId: env.APP_ID,
    name: env.BOT_NAME,
    version: env.BOT_VERSION,
    features: {
      slashCommands: env.DISCORD_ENABLE_SLASH_COMMANDS,
      buttons: env.DISCORD_ENABLE_BUTTONS,
      modals: env.DISCORD_ENABLE_MODALS,
      autocomplete: env.DISCORD_ENABLE_AUTOCOMPLETE,
    },
  },

  // EA API
  ea: {
    deploymentUrl: env.DEPLOYMENT_URL,
    timeout: env.EA_API_TIMEOUT,
    retryAttempts: env.EA_RETRY_ATTEMPTS,
  },

  // Website
  website: {
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    apiUrl: env.NEXT_PUBLIC_API_URL,
    port: env.WEBSITE_PORT,
    botInviteUrl: env.NEXT_PUBLIC_BOT_INVITE_URL,
    features: {
      realTime: env.WEBSITE_ENABLE_REAL_TIME,
      darkMode: env.WEBSITE_ENABLE_DARK_MODE,
      mobileApp: env.WEBSITE_ENABLE_MOBILE_APP,
    },
  },

  // Real-time
  realtime: {
    websocketPort: env.WEBSOCKET_PORT,
    corsOrigin: env.WEBSOCKET_CORS_ORIGIN,
    redis: {
      url: env.REDIS_URL,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
    },
  },

  // Security
  security: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    corsOrigin: env.CORS_ORIGIN.split(','),
    corsCredentials: env.CORS_CREDENTIALS,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
  },

  // Analytics
  analytics: {
    googleAnalyticsId: env.GOOGLE_ANALYTICS_ID,
    sentryDsn: env.SENTRY_DSN,
    newRelic: {
      licenseKey: env.NEW_RELIC_LICENSE_KEY,
      appName: env.NEW_RELIC_APP_NAME,
    },
  },

  // Development
  development: {
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    enableSwagger: env.ENABLE_SWAGGER,
    enableDebugRoutes: env.ENABLE_DEBUG_ROUTES,
    enableMockData: env.ENABLE_MOCK_DATA,
  },

  // Feature Flags
  features: {
    vfl: {
      trades: env.VFL_ENABLE_TRADES,
      commissioners: env.VFL_ENABLE_COMMISSIONERS,
      notifications: env.VFL_ENABLE_NOTIFICATIONS,
      analytics: env.VFL_ENABLE_ANALYTICS,
      playerComparison: env.VFL_ENABLE_PLAYER_COMPARISON,
      waitlist: env.VFL_ENABLE_WAITLIST,
    },
  },

  // Third-party
  integrations: {
    twitch: {
      clientId: env.TWITCH_CLIENT_ID,
      clientSecret: env.TWITCH_CLIENT_SECRET,
      secret: env.TWITCH_SECRET,
      callbackUrl: env.TWITCH_CALLBACK_URL,
    },
    youtube: {
      apiKey: env.YOUTUBE_API_KEY,
    },
    email: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM,
    },
  },

  // Storage
  storage: {
    gcs: {
      bucketName: env.GCS_BUCKET_NAME,
      projectId: env.GCS_PROJECT_ID,
    },
    backup: {
      enabled: env.BACKUP_ENABLED,
      schedule: env.BACKUP_SCHEDULE,
      retentionDays: env.BACKUP_RETENTION_DAYS,
    },
  },

  // Performance
  performance: {
    database: {
      poolMin: env.DB_POOL_MIN,
      poolMax: env.DB_POOL_MAX,
      poolIdleTimeout: env.DB_POOL_IDLE_TIMEOUT,
    },
    cache: {
      ttl: {
        players: env.CACHE_TTL_PLAYERS,
        teams: env.CACHE_TTL_TEAMS,
        games: env.CACHE_TTL_GAMES,
        standings: env.CACHE_TTL_STANDINGS,
      },
    },
    api: {
      maxPlayersPerRequest: env.API_MAX_PLAYERS_PER_REQUEST,
      maxGamesPerRequest: env.API_MAX_GAMES_PER_REQUEST,
      maxComparisonPlayers: env.API_MAX_COMPARISON_PLAYERS,
    },
  },

  // Testing
  testing: {
    databaseUrl: env.TEST_DATABASE_URL,
    discordToken: env.TEST_DISCORD_TOKEN,
    runIntegrationTests: env.RUN_INTEGRATION_TESTS,
    mockEaApi: env.MOCK_EA_API,
    mockDiscordApi: env.MOCK_DISCORD_API,
  },
} as const;

// Type exports
export type Config = typeof config;
export type Environment = typeof env;

// Validation helper
export function validateConfig(): boolean {
  try {
    // Check required configurations based on environment
    if (config.development.nodeEnv === 'production') {
      if (!config.database.serviceAccount && !config.database.serviceAccountFile) {
        throw new Error('Production requires SERVICE_ACCOUNT or SERVICE_ACCOUNT_FILE');
      }
      
      if (!config.security.jwtSecret || config.security.jwtSecret.length < 32) {
        throw new Error('Production requires a strong JWT_SECRET (32+ characters)');
      }
    }

    // Check Discord configuration
    if (!config.discord.token || !config.discord.publicKey || !config.discord.appId) {
      throw new Error('Discord configuration is incomplete');
    }

    // Check EA configuration
    if (!config.ea.deploymentUrl) {
      throw new Error('DEPLOYMENT_URL is required for EA integration');
    }

    console.log('✅ Environment configuration validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    return false;
  }
}

// Initialize configuration validation
if (config.development.nodeEnv !== 'test') {
  validateConfig();
}