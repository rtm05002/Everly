# Everly AI Assistant - Nudges System Documentation

## Overview

The Everly platform includes an AI-powered nudge system that automatically engages community members based on configurable triggers and templates. This document describes the current implementation, data structure, and configuration flow.

## Architecture

### Components

1. **Server Actions** (`src/app/ai-assistant/actions.ts`)
   - `loadAIConfig()`: Loads AI configuration from Supabase
   - `saveAIConfig(config)`: Saves AI configuration to Supabase
   - Default configuration is provided if database is unavailable

2. **Configuration Form** (`src/app/ai-assistant/config-form.tsx`)
   - Smart Responses configuration (AI Mode, Tone, Banned Phrases, Escalate If)
   - Styled with color-coded sections (blue for settings, red for filtering)

3. **Nudge Recipes Form** (`src/app/ai-assistant/nudge-recipes-form.tsx`)
   - Manages nudge recipe CRUD operations
   - Displays recipes in blue-themed cards with numbered badges
   - Add/Remove recipe functionality

4. **Nudge Evaluation** (`src/lib/nudges.ts`)
   - Evaluates nudge triggers based on events and member data
   - Returns list of nudges that should be sent

5. **Preview & Run** (`src/app/ai-assistant/preview-nudges.tsx`, `run-nudges-button.tsx`)
   - Preview: Shows what nudges would be sent based on current data
   - Run: Executes the nudges

## Data Structure

### AI Configuration (TypeScript Interface)

```typescript
interface AIConfig {
  mode: "assist" | "moderate" | "proactive"
  tone: "friendly" | "concise" | "enthusiastic"
  bannedPhrases: string[]
  escalateIf: string[]
  nudgeRecipes: NudgeRecipe[]
}

interface NudgeRecipe {
  name: string
  trigger: string
  messageTemplate: string
}
```

### Default Configuration

```typescript
const DEFAULT_AI_CONFIG: AIConfig = {
  mode: "assist",
  tone: "friendly",
  bannedPhrases: ["spam", "hate speech", "harassment"],
  escalateIf: ["threats", "illegal content", "repeated violations"],
  nudgeRecipes: [
    {
      name: "Welcome New Members",
      trigger: "new_member_joined",
      messageTemplate: "Welcome to the community! We're excited to have you here. Check out our bounties to get started earning rewards!"
    },
    {
      name: "Encourage Participation",
      trigger: "low_activity",
      messageTemplate: "We'd love to see more engagement from you! Consider participating in our active bounties."
    }
  ]
}
```

## Database Schema

### Supabase Storage

The AI configuration is stored in the `hubs` table:

**Table**: `hubs`
- **Column**: `settings` (JSONB)
- **Path**: `settings.ai_config`

**Structure**:
```json
{
  "settings": {
    "ai_config": {
      "mode": "assist",
      "tone": "friendly",
      "bannedPhrases": ["spam", "hate speech"],
      "escalateIf": ["threats", "illegal content"],
      "nudgeRecipes": [
        {
          "name": "Welcome New Members",
          "trigger": "new_member_joined",
          "messageTemplate": "Welcome to the community!..."
        }
      ]
    }
  }
}
```

### Hub ID Configuration

The system uses `DEMO_HUB_ID` from environment variables to identify which hub to load/save configuration for:
- Environment variable: `DEMO_HUB_ID`
- Loaded in: `src/lib/env.ts`

## User Flow

### Smart Responses Configuration

1. User clicks "Smart Responses" card
2. Card expands to reveal configuration form
3. User configures:
   - **AI Mode**: Assist, Moderate, or Proactive
   - **Tone**: Friendly, Concise, or Enthusiastic
   - **Banned Phrases**: List of phrases to filter
   - **Escalate If**: Conditions for escalation
4. User clicks "Save Configuration"
5. Configuration is saved to Supabase

### Engagement Nudges Configuration

1. User clicks "Engagement Nudges" card
2. Card expands to reveal:
   - Nudge Recipes form
   - Preview Nudges section
   - Run Nudges button
3. User can:
   - **Add Recipe**: Click "+ Add Recipe" button
   - **Edit Recipe**: Modify name, trigger, or message template
   - **Remove Recipe**: Click trash icon
4. Preview shows what nudges would be sent based on current events/members
5. User clicks "Save Nudges" to persist changes
6. User clicks "Run Nudges Now" to execute nudges

## Nudge Evaluation Logic

The system evaluates nudge triggers against recent events and member data:

**Function**: `evaluateNudges(config, events, members)` in `src/lib/nudges.ts`

**Process**:
1. Iterate through each nudge recipe in config
2. Check if trigger conditions are met based on events/members
3. Return list of nudges that should be sent
4. Include target member ID, message, and metadata

## Current Implementation Status

### Working Features
✅ Configuration UI with styled sections
✅ CRUD operations for nudge recipes
✅ Load/Save from Supabase
✅ Nudge evaluation logic
✅ Preview functionality
✅ Run nudges button (UI only)

### Missing/Incomplete Features
❌ Actual nudge execution (sending messages)
❌ Integration with messaging platform
❌ Analytics/metrics for sent nudges
❌ Nudge history/logs
❌ Member preferences for nudges
❌ Rate limiting/prevention of duplicate nudges
❌ A/B testing for nudge messages

## Environment Setup

### Required Environment Variables

```bash
DATA_BACKEND=db  # or "file"
DEMO_HUB_ID=<your-hub-id>
SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE=<supabase-key>
```

### Database Migration

The AI configuration is stored in the existing `hubs` table. No separate migration is needed, but ensure the `settings` column (JSONB) exists.

## Future Development Recommendations

1. **Nudge Execution**
   - Implement actual message sending via Whop API or similar
   - Create `nudge_logs` table to track sent nudges
   - Add retry logic for failed sends

2. **Smart Triggers**
   - Implement more sophisticated trigger evaluation
   - Add time-based triggers (e.g., "3 days inactive")
   - Add behavioral triggers (e.g., "viewed bounty but didn't complete")

3. **Member Preferences**
   - Allow members to opt-out of certain nudges
   - Store preferences in `members` table
   - Respect preferences when evaluating nudges

4. **Analytics**
   - Track nudge open rates
   - Track nudge response rates
   - Track nudge effectiveness (did member complete action?)

5. **Rate Limiting**
   - Prevent sending duplicate nudges
   - Add cooldown periods between nudges to same member
   - Implement daily/weekly nudge limits

6. **Testing & Optimization**
   - A/B test different message templates
   - Track which triggers are most effective
   - Machine learning for optimal send times

## File Structure

```
src/app/ai-assistant/
├── actions.ts              # Server actions (load/save config)
├── page.tsx                # Main page component
├── ai-assistant-cards.tsx  # Feature cards with expand/collapse
├── config-form.tsx         # Smart Responses configuration form
├── nudge-recipes-form.tsx  # Nudge recipes management form
├── preview-nudges.tsx      # Preview what nudges would be sent
└── run-nudges-button.tsx   # Button to execute nudges

src/lib/
├── nudges.ts               # Nudge evaluation logic
└── types.ts                # Type definitions (AIConfig, NudgeRecipe)

src/server/
└── db.ts                   # Supabase client creation
```

## Key Functions

### Load Configuration
```typescript
const config = await loadAIConfig()
// Returns AIConfig from Supabase or default config
```

### Save Configuration
```typescript
await saveAIConfig(config)
// Saves to Supabase hubs.settings.ai_config
```

### Evaluate Nudges
```typescript
const nudges = evaluateNudges(config, events, members)
// Returns array of nudges that should be sent
```

## Questions for GPT Assistance

1. How should we implement actual nudge execution/sending?
2. What's the best approach for preventing duplicate nudges?
3. How should we structure the nudge_logs table?
4. What triggers should we prioritize for engagement?
5. How can we optimize nudge timing and frequency?
6. What analytics should we track for nudges?
7. How should we handle member preferences and opt-outs?

## Current Triggers

**Default Triggers**:
- `new_member_joined`: When a new member joins
- `low_activity`: When member has been inactive

**Suggested Future Triggers**:
- `viewed_bounty_not_completed`: Member viewed a bounty but didn't complete
- `near_deadline`: Bounty approaching deadline
- `streak_missed`: Member missed their engagement streak
- `milestone_reached`: Member hit a milestone (e.g., first bounty)
- `no_activity_7d`: No activity for 7 days
- `no_activity_30d`: No activity for 30 days
- `first_time_participant`: First time participating in a bounty
