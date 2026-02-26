# Workout Program Builder

## Overview
The Workout Program Builder allows users to create custom workout programs, add exercises and treadmill blocks, and schedule them to specific calendar days.

## Database Schema

### Tables
1. **workout_programs** - Program templates
   - `id` (UUID, PK)
   - `user_id` (UUID, FK to users)
   - `name` (TEXT)
   - `description` (TEXT, optional)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **program_blocks** - Exercises or treadmill intervals within a program
   - `id` (UUID, PK)
   - `program_id` (UUID, FK to workout_programs)
   - `block_order` (INTEGER) - Order within the program
   - `block_type` (TEXT) - 'exercise' or 'treadmill'
   
   **For exercises:**
   - `exercise_id` (TEXT) - References catalog.id
   - `target_sets` (INTEGER)
   - `target_reps` (INTEGER)
   - `target_weight` (NUMERIC)
   - `is_superset` (BOOLEAN)
   - `superset_group` (INTEGER) - Groups exercises into supersets
   
   **For treadmill blocks:**
   - `duration_seconds` (INTEGER)
   - `incline` (NUMERIC)
   - `intensity` (TEXT) - 'zone2', 'base', 'push', 'all_out'
   
   - `notes` (TEXT, optional)

3. **program_schedule** - Assigns programs to specific dates
   - `id` (UUID, PK)
   - `user_id` (UUID, FK to users)
   - `program_id` (UUID, FK to workout_programs)
   - `scheduled_date` (DATE)
   - `completed` (BOOLEAN)
   - `completed_at` (TIMESTAMPTZ)
   - UNIQUE constraint on `(user_id, scheduled_date)` - One program per day

### Indexes
- `idx_workout_programs_user` on `workout_programs(user_id)`
- `idx_program_blocks_program` on `program_blocks(program_id, block_order)`
- `idx_program_schedule_user_date` on `program_schedule(user_id, scheduled_date)`

### RLS Policies
- All users can view all programs/blocks/schedules (for sharing/inspiration)
- Users can only manage their own programs and schedules

## API Functions

### Program Management (`src/services/programApi.ts`)
- `getPrograms(userId)` - Fetch all programs for a user
- `createProgram(userId, name, description?)` - Create a new program
- `deleteProgram(programId)` - Delete a program (cascades to blocks)

### Block Management
- `getProgramBlocks(programId)` - Fetch all blocks for a program
- `addProgramBlock(block)` - Add an exercise or treadmill block
- `deleteProgramBlock(blockId)` - Remove a block from a program

## UI Components

### ProgramBuilder (`src/components/ProgramBuilder.tsx`)
Main component at `/programs` route.

**Features:**
- Grid view of all user programs
- Create/delete programs
- Click "Edit" to open program editor modal

### Program Editor Modal
Split-panel interface:

**Left Panel - Available Exercises:**
- Category filter buttons (All, Strength, Metcon, Gymnastics, Endurance)
- Scrollable list of exercises from catalog
- Click to add to program

**Right Panel - Program Blocks:**
- Ordered list of exercises in the program
- Shows: exercise name, sets × reps, category
- Delete button for each block
- Empty state with dumbbell icon

## Implementation Phases

### Phase 1 ✅ (Complete)
- Database schema
- Basic program CRUD
- Program list UI
- Create/delete programs

### Phase 2 ✅ (Complete)
- Program editor modal
- Exercise selection with category filtering
- Add/remove exercises from program
- Improved readability and layout

### Phase 3 (Planned)
- Edit sets/reps/weight for each exercise
- Add treadmill blocks with duration/incline/intensity
- Reorder exercises via drag-and-drop
- Superset grouping

### Phase 4 (Planned)
- Calendar view for scheduling
- Assign programs to specific days
- Copy week/month of programs
- Mark programs as completed
- Execute program with timer (like current treadmill intervals)

## Usage Flow

1. Navigate to `/programs`
2. Click "+ New Program"
3. Enter program name and description
4. Click "Edit" on the program card
5. Filter exercises by category
6. Click exercises to add them to your program
7. Delete exercises with trash icon
8. Close modal to save

## Future Enhancements
- Program templates (pre-built programs)
- Share programs with other users
- Clone/duplicate programs
- Program analytics (completion rate, volume tracking)
- Rest timer between exercises
- Video demonstrations for exercises
