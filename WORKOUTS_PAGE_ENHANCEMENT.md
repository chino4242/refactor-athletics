# Workouts Page Enhancement - Default Weekly Program Display

## Overview
Added visibility of the default weekly schedule to the Workouts page so users can see what workouts are planned for each day of the week.

## Changes Made

### WorkoutBuilder.tsx
1. **Added State**: `weeklySchedule` to store the default weekly program
2. **Added API Call**: `loadWeeklySchedule()` fetches from `/api/workouts/schedule`
3. **Added UI Section**: "Default Weekly Program" displayed above user's custom workouts

## New UI Section

### Default Weekly Program Card
- **Location**: Top of Workouts page, above "Your Custom Workouts"
- **Badge**: "Read-Only" indicator (blue)
- **Grid Layout**: Responsive grid showing all 7 days
- **Day Cards** display:
  - Day name (Monday, Tuesday, etc.)
  - Workout type badge (Strength, Cardio, Hybrid, Recovery)
  - Workout title
  - XP value
- **Info Tip**: Explains users can override default plan by scheduling custom workouts

### Visual Design
- Each day card shows:
  - **Type Badge Colors**:
    - Strength: Orange
    - Cardio: Blue
    - Hybrid: Purple
    - Recovery: Gray
  - Hover effect on cards
  - Consistent with app's dark theme

## User Experience

### Before
- Users saw workouts on Train page but couldn't find them in Workouts page
- No way to view the full weekly schedule at a glance
- Confusion about where workouts came from

### After
- Clear visibility of default weekly program
- Users understand this is the baseline schedule
- Can see all 7 days at once
- Tip explains how to override with custom workouts
- "Read-Only" badge sets expectations

## How It Works

1. **Default Schedule**: Loaded from `public/workouts/weekly/*.txt` files
2. **API Endpoint**: `/api/workouts/schedule` parses text files and returns JSON
3. **Display**: Shows in dedicated section with read-only indicator
4. **Override**: Users can schedule custom workouts to specific dates (existing functionality)

## Future Enhancements (Optional)
- Add "View Details" button to see full workout content
- Allow users to "Clone to Custom" to create editable versions
- Add ability to edit the default weekly files through UI
- Show which days have custom overrides scheduled
