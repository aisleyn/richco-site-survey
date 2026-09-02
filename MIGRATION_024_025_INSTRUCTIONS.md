# Room Hierarchy Feature — Migration Instructions

## ✅ Migrations Created

Two new migration files have been created:

1. **`supabase/migrations/024_add_project_rooms.sql`** — Creates `project_rooms` table
2. **`supabase/migrations/025_add_room_linkage.sql`** — Adds `room_id` to related tables

## 🚀 How to Apply

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com and sign in to your project
   - Click "SQL Editor"

2. **Run Migration 024 First**
   - Open `supabase/migrations/024_add_project_rooms.sql` in your editor
   - Copy the entire SQL content
   - Paste into Supabase SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - Wait for success message

3. **Run Migration 025 Second**
   - Open `supabase/migrations/025_add_room_linkage.sql` in your editor
   - Copy the entire SQL content
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for success message

### Option B: Via CLI (if you have Supabase CLI installed)

```bash
# Navigate to project directory
cd C:\Users\aisle\Richco\richco-site-survey

# Reset database (WARNING: deletes all data - only use in dev!)
# supabase db reset

# Or migrate up (applies pending migrations)
supabase migration list
supabase migration up
```

## ✅ Verify Migrations Applied

After running both migrations, verify in Supabase SQL Editor:

```sql
-- Check if project_rooms table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'project_rooms';

-- Should return: project_rooms

-- Check if room_id column exists on surveys
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'room_id';

-- Should return: room_id
```

## 📋 What Each Migration Does

### Migration 024: `project_rooms` Table

Creates a new table for storing rooms within zones:

```
Columns:
- id (UUID, primary key)
- project_id (UUID, foreign key to projects)
- subcategory_id (UUID, foreign key to zones) ← ALWAYS belongs to a zone
- name (TEXT, unique per zone)
- description (TEXT, optional)
- status (TEXT, same as zones: concept/in_development/approved/denied/on_hold)
- room_order (INTEGER, for explicit ordering)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ, auto-updated on row change)

RLS Policies:
- Staff: full access (create, read, update, delete)
- Clients: read-only access to rooms in their assigned project
```

### Migration 025: Add `room_id` to Related Tables

Adds optional `room_id` foreign keys to:
- `surveys` → can optionally belong to a room
- `floor_plan_pages` → can optionally belong to a room
- `samples` → can optionally belong to a room
- `map_waypoints` → can optionally belong to a room

All `room_id` values are **nullable** (optional). When a room is deleted, the `room_id` becomes NULL.

Adds indexes for efficient filtering by room.

## 🔙 Rollback (if needed)

If something goes wrong, you can roll back. In Supabase SQL Editor:

```sql
-- Drop the room_id columns first
ALTER TABLE public.surveys DROP COLUMN room_id;
ALTER TABLE public.floor_plan_pages DROP COLUMN room_id;
ALTER TABLE public.samples DROP COLUMN room_id;
ALTER TABLE public.map_waypoints DROP COLUMN room_id;

-- Then drop the project_rooms table
DROP TABLE IF EXISTS public.project_rooms;
```

## ⚠️ Important Notes

- **Backward Compatible:** Existing surveys/pages/samples/waypoints continue to work. The `room_id` column is nullable.
- **No Data Loss:** This migration doesn't delete anything, only adds new columns and a new table.
- **RLS Policies:** Clients see rooms only if they can access the parent project (same as zones).
- **Safe Deletion:** If a room is deleted, surveys/pages/samples/waypoints revert to zone-only linkage (no data loss).

## 🎯 Next Steps After Migration

1. ✅ Run both migrations in Supabase
2. ⏳ Verify migrations applied (see "Verify Migrations Applied" section above)
3. 📝 Update TypeScript types (add `room_id: string | null` to Survey, FloorPlanPage, Sample, MapWaypoint interfaces)
4. 🛠️ Create `services/rooms.ts` service file for room CRUD operations
5. 🎨 Update survey form UI to show room selector (cascading dropdown after zone selection)
6. 📊 Update survey detail pages to display room information
7. 🧪 Test end-to-end (create survey with room, edit, delete room, verify survey reverts to zone)
8. 🚀 Deploy to Azure

## 📞 Troubleshooting

**Error: "relation 'project_rooms' does not exist"**
- Make sure migration 024 ran successfully first
- Check Supabase SQL Editor for any error messages during migration 024

**Error: "column 'room_id' already exists"**
- Migration was already applied
- Safe to ignore; proceed to next steps

**Can't paste SQL into Supabase Editor**
- Make sure you're in the "SQL Editor" tab (not "Table Editor")
- Try refreshing the page and trying again
- If still stuck, try using Supabase CLI instead

## 📝 Files to Update Next

After migrations are applied, these files need updates:

```
src/types/index.ts
  - Add room_id to Survey, FloorPlanPage, Sample, MapWaypoint interfaces
  - Add new ProjectRoom interface

src/services/rooms.ts (NEW FILE)
  - getRoomsByZone()
  - createRoom()
  - updateRoom()
  - deleteRoom()

src/services/surveys.ts
  - Update createSurvey() to accept room_id
  - Update updateSurvey() to accept room_id

src/pages/staff/SurveyFormPage.tsx
  - Add room selection after zone selection (cascading dropdown)
  - Load rooms when zone changes
  - Handle room_id in form submission

src/pages/staff/SurveyDetailPage.tsx
  - Display room in breadcrumb (e.g., "Zone > Room")

src/pages/staff/SurveysPage.tsx
  - Show room in survey list (if present)
```

Ready to proceed? Let me know when migrations are applied and I can help with the code updates!
