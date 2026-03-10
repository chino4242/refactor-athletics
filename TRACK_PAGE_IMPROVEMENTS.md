# Track Page Improvements - Date Navigation & Macro Editing

## Overview
Enhanced the Track page with date navigation and improved macro editing capabilities.

## New Features

### 1. Date Navigation
- **Previous/Next Day Buttons**: Navigate through your history day by day
- **Jump to Today**: Quick button to return to current date
- **Visual Indicators**: 
  - 📅 Today (green)
  - 📜 Past Date (orange)
  - 🔮 Future Date (gray, disabled)
- **Keyboard Shortcuts**:
  - `←` Previous day
  - `→` Next day
  - `T` Jump to today
- **Smart Constraints**: Cannot navigate to future dates

### 2. Improved Macro Editing

The macro log modal now uses **"Set Exact Total"** mode exclusively:

- **Set macros to exact values** for the selected day
- **Shows current totals** for reference at the top
- **Automatically calculates differences** (can increase or decrease)
- **Input placeholders** show current values
- **Quick water buttons** (+8, +16, +32 oz) add to current total

#### How It Works
- Enter the exact total you want for each macro
- Example: Current 150g protein → Enter 145g → Logs -5g adjustment
- Example: Current 50g protein → Enter 75g → Logs +25g adjustment
- Leave fields empty to keep current values unchanged

#### Current Totals Display
The modal always shows at the top:
- 🍞 Current carbs
- 🥑 Current fat  
- 🥩 Current protein
- 💧 Current water

This makes it clear what you're adjusting from.

## Technical Implementation

### Files Modified
1. **TrackPage.tsx**
   - Added date state management (`selectedDate`, `selectedDateTs`)
   - Added navigation handlers (`goToPreviousDay`, `goToNextDay`, `goToToday`)
   - Added keyboard event listeners
   - Added date navigation UI component
   - Passes `targetDateTs` to DailyQuest component

2. **DailyQuest.tsx**
   - Updated `useEffect` to re-fetch data when `targetDateTs` changes
   - Now properly loads data for selected date

3. **NutritionTracker.tsx**
   - Simplified `handleLogMacro` to always use "Set Total" mode
   - Supports negative adjustments for decreasing values
   - Improved calorie auto-calculation for adjustments

4. **MacroLogModal.tsx**
   - Removed mode toggle (Add vs Set Total)
   - Always shows current totals at the top
   - Simplified to only "Set Exact Total" functionality
   - Input placeholders show current values

## User Experience Improvements

### Before
- Could only view/edit today's macros
- No way to correct past entries
- Had to manually calculate differences

### After
- Navigate to any past date
- View historical macro data
- Edit macros by setting exact totals
- Clear visual feedback on what date you're viewing
- Keyboard shortcuts for power users

## Use Cases

### Scenario 1: Forgot to Log Yesterday
1. Click "← Prev" or press `←` key
2. See yesterday's date with "📜 Past Date" indicator
3. Log macros as normal

### Scenario 2: Need to Correct Today's Protein
1. Open macro log modal
2. See current total displayed at top (e.g., 150g)
3. Enter correct total in protein field (e.g., 145g)
4. Click "Set Totals"
5. System logs -5g adjustment automatically

### Scenario 3: Review Last Week
1. Use arrow keys to navigate day by day
2. Review each day's nutrition
3. Press `T` to jump back to today

## Future Enhancements (Optional)
- Date picker for jumping to specific dates
- Week view with 7-day grid
- Month view calendar
- Bulk edit mode for multiple days
- Copy macros from one day to another
- Macro templates/presets
