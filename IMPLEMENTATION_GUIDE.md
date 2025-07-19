# VFL Manager Implementation Guide

## Quick Start

This guide will help you implement the VFL Manager redesign while preserving all existing EA integration logic.

## Phase 1: Bot Infrastructure Setup

### 1. Install New Dependencies

```bash
npm install discord.js@latest
npm install @types/node@latest
```

### 2. Update Bot Entry Point

Replace the existing Discord bot initialization with the new VFL Manager:

```typescript
// src/index.ts - Update the main entry point
import { vflManager } from './bot/VFLManager';

// Keep existing server setup
import app from "./server";

const port = process.env.PORT || 3000;

// Start the web server (preserve existing functionality)
app.listen(port, () => {
  console.log(`🌐 Server started on port ${port}`);
});

// Start the VFL Manager bot
if (process.env.DISCORD_TOKEN) {
  vflManager.login(process.env.DISCORD_TOKEN);
} else {
  console.error('❌ DISCORD_TOKEN environment variable is required');
}
```

### 3. Environment Variables

Add these new environment variables to your deployment:

```env
# Existing variables (keep these)
DISCORD_TOKEN=your_discord_token
PUBLIC_KEY=your_public_key
APP_ID=your_app_id

# New VFL Manager variables
VFL_WEBSITE_URL=https://maddenvfl.com
VFL_ENABLE_TRADES=true
VFL_ENABLE_COMMISSIONERS=true
VFL_ENABLE_NOTIFICATIONS=true
```

## Phase 2: Database Schema Extensions

### 1. Create New Firestore Collections

The new collections will be automatically created when first used. No manual setup required.

### 2. Extend Existing League Settings

Update your league settings documents to include VFL channels:

```typescript
// Example update for existing leagues
const updateLeagueSettings = async (guildId: string) => {
  await db.collection("league_settings").doc(guildId).set({
    vfl_channels: {
      trades: null, // Will be set when configured
      commissioners: null,
      game_results: null,
      rating_changes: null,
      waiver_claims: null,
      roster_moves: null,
      announcements: null,
    },
    vfl_notifications: {
      trades: true,
      game_results: true,
      rating_changes: true,
      waiver_claims: true,
      roster_moves: true,
    },
    trade_settings: {
      require_approval: true,
      auto_approve_after_hours: 24,
      allowed_commissioners: [],
    }
  }, { merge: true });
};
```

## Phase 3: Preserve EA Integration

### 1. Keep Existing EA Logic

The new VFL Manager preserves all existing EA integration:

- ✅ EA token refresh logic (unchanged)
- ✅ Data export system (unchanged)  
- ✅ Real-time updates (enhanced)
- ✅ Database structure (extended)

### 2. Enhanced Event Handling

The new system adds enhanced event handling while keeping existing logic:

```typescript
// Existing EA events still work
MaddenDB.on("MADDEN_SCHEDULE", handleGameUpdate);
MaddenDB.on("MADDEN_PLAYER", handlePlayerUpdate);

// New VFL events added
EventDB.on("TRADE_PROPOSED", handleTradeProposed);
EventDB.on("TRADE_COMPLETED", handleTradeCompleted);
```

## Phase 4: Command Migration

### 1. Gradual Command Migration

You can migrate commands gradually:

1. Keep existing commands working
2. Add new VFL commands alongside
3. Gradually deprecate old commands

### 2. New Command Structure

```typescript
// New commands follow this pattern:
/trade propose @user
/trade list
/trade approve trade_id
/commissioner add @user
/league setup
/stats player player_name
```

## Phase 5: Website Deployment

### 1. Deploy Website to Vercel

```bash
cd website
npm install
npm run build
vercel --prod
```

### 2. Configure Domain

Point `maddenvfl.com` to your Vercel deployment.

### 3. Environment Variables for Website

```env
NEXT_PUBLIC_SITE_URL=https://maddenvfl.com
NEXT_PUBLIC_BOT_INVITE_URL=your_bot_invite_url
DATABASE_URL=your_firestore_connection
```

## Phase 6: Testing & Rollout

### 1. Testing Checklist

- [ ] EA data still syncs correctly
- [ ] Existing commands still work
- [ ] New trade system functions
- [ ] Website displays league data
- [ ] Real-time updates work
- [ ] Mobile responsiveness

### 2. Gradual Rollout

1. **Week 1**: Deploy to test server
2. **Week 2**: Deploy to staging with select leagues
3. **Week 3**: Full production deployment
4. **Week 4**: Monitor and optimize

## Phase 7: Migration Commands

### 1. Setup Command for Existing Leagues

```typescript
// /setup command helps existing leagues migrate
/setup channels  // Configure all VFL channels at once
/setup commissioners  // Set up commissioner roles
/setup notifications  // Configure notification preferences
```

### 2. Data Migration Script

```typescript
// Run this script to migrate existing league data
const migrateExistingLeagues = async () => {
  const leagues = await db.collection("league_settings").get();
  
  for (const doc of leagues.docs) {
    const guildId = doc.id;
    const settings = doc.data();
    
    // Add VFL settings to existing leagues
    await updateLeagueSettings(guildId);
    
    console.log(`✅ Migrated league: ${guildId}`);
  }
};
```

## Troubleshooting

### Common Issues

1. **EA Connection Issues**: The existing EA logic is preserved, so any existing issues will persist but won't be caused by VFL Manager.

2. **Discord Permissions**: Ensure the bot has the necessary permissions for the new features:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Manage Messages (for trade approvals)

3. **Database Permissions**: Ensure Firestore rules allow the new collections.

### Support

For implementation support:
- Check existing EA integration logs
- Monitor new VFL Manager logs
- Test with a small league first
- Keep existing functionality as fallback

## Success Metrics

Track these metrics to ensure successful implementation:

- ✅ Zero downtime during migration
- ✅ All existing EA features working
- ✅ New trade system adoption
- ✅ Website traffic and engagement
- ✅ User feedback and satisfaction

## Rollback Plan

If issues arise:

1. **Immediate**: Disable new commands, keep existing bot
2. **Short-term**: Revert to previous Discord bot version
3. **Long-term**: Address issues and re-deploy

The modular design ensures you can disable VFL features while keeping EA integration working.