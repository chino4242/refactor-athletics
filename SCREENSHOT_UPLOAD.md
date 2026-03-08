# Screenshot Upload Integration Guide

## Overview
The screenshot uploader uses Anthropic's Claude 3.5 Sonnet with vision to extract fitness data from screenshots of apps like MyFitnessPal, Apple Fitness, etc.

## Setup

### 1. Install Anthropic SDK
```bash
npm install @anthropic-ai/sdk
```

### 2. Get API Key
1. Sign up at https://console.anthropic.com
2. Go to API Keys → Create Key
3. Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Restart Dev Server
```bash
npm run dev
```

## Usage

### Nutrition Tracking
In `MacroLogModal.tsx` - already integrated! Just upload a screenshot of:
- MyFitnessPal daily summary
- Cronometer nutrition log
- Any nutrition label or food diary

### Workout Tracking
In `Training.tsx` - already integrated! Upload screenshots of:
- Strong app workout logs
- Apple Fitness workout summary
- Any workout tracking app

### Habit Tracking
Add to `DailyQuest.tsx`:

```tsx
import ScreenshotUploader from './ScreenshotUploader';

const handleHabitData = (data: any) => {
  if (data.steps) logHabitAction(userId, 'habit_steps', data.steps, date);
  if (data.sleep) logHabitAction(userId, 'habit_sleep', data.sleep, date);
  if (data.water) logHabitAction(userId, 'habit_water', data.water, date);
};

<ScreenshotUploader 
  type="habits" 
  onDataExtracted={handleHabitData} 
/>
```

## Cost
- **Claude 3.5 Sonnet**: ~$0.003 per image (3x cheaper than GPT-4 Vision)
- **Monthly estimate**: ~$1-2 for daily use
- First $5 free credit with new account

## Why Claude?
- ✅ Better at structured data extraction
- ✅ More accurate with text-heavy screenshots
- ✅ 3x cheaper than GPT-4 Vision
- ✅ Better JSON compliance (fewer parsing errors)
- ✅ Faster response times

## Supported Apps
- MyFitnessPal
- Cronometer
- Strong
- Apple Fitness
- Fitbit
- Strava
- Any app with readable text/numbers

## Future Enhancements
- Add confidence scores
- Support batch uploads
- Manual correction UI
- Store screenshots for audit trail
