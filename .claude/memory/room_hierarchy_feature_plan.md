---
name: room-hierarchy-feature-plan
description: "Feature plan for adding optional Room hierarchy within Zones for survey organization in development projects"
metadata:
  type: project
  date: 2026-09-02
  status: design-complete
  feature_scope: "Projects > Zones > Rooms > Surveys (optional)"
  backward_compat: true
---

# Room Hierarchy Feature Plan — Survey Organization by Rooms

## 📋 Overview

For **in-development projects**, enable staff to organize surveys at a finer granularity:
- **Before:** Projects → Zones → Surveys
- **After:** Projects → Zones → Rooms → Surveys (optional)

Rooms are optional per-survey, maintaining backward compatibility with existing surveys that only have zone linkage.

---

## 🎯 Scope & Requirements

### What's Being Added
✅ New `project_rooms` table to create rooms within zones  
✅ Optional `room_id` FK on surveys (+ other content tables)  
✅ Staff UI: Zone dropdown → Room dropdown (cascading selects)  
✅ RLS policies for room visibility (same access as parent zone)  
✅ Backward-compatible (existing surveys unaffected)  

### What's NOT Changing
❌ Zones themselves (project_subcategories table)  
❌ Floor plans, samples, waypoints linkage (rooms optional for surveys mainly)  
❌ Client-facing views (unless future phases add room filtering)  

### Only for Development Projects
- Rooms feature applies to `project_type = 'in_development'` projects
- Maintenance/completed projects continue without rooms
- UI will hide room selector for non-development projects

---

## 🗄️ Database Schema Changes

### 1. Create `project_rooms` Table

```sql
-- Migration 024: Add project_rooms table
CREATE TABLE public.project_rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subcategory_id  UUID NOT NULL REFERENCES public.project_subcategories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, subcategory_id, name),
  UNIQUE (subcategory_id, name)
);

-- Index for fast zone → rooms queries
CREATE INDEX idx_project_rooms_subcategory 
ON project_rooms(subcategory_id);

CREATE INDEX idx_project_rooms_project 
ON project_rooms(project_id);
```

**Design Notes:**
- Rooms ALWAYS belong to a specific zone (subcategory_id is NOT NULL)
- Unique constraint prevents duplicate room names within same zone
- Rooms are cascade-deleted if zone is deleted
- No "status" field needed (rooms inherit parent zone status)

---

### 2. Add `room_id` to Surveys

```sql
-- Alter surveys table to support optional room linkage
ALTER TABLE public.surveys
ADD COLUMN room_id UUID
  REFERENCES public.project_rooms(id)
  ON DELETE SET NULL;

-- Index for room → surveys queries
CREATE INDEX idx_surveys_room 
ON surveys(room_id);
```

**Design Notes:**
- `room_id` is nullable (backward-compatible with existing surveys)
- When a room is deleted, survey.room_id becomes NULL (doesn't delete survey)
- Validation: if room_id is set, must belong to same project as survey
- No constraint at DB level to enforce zone consistency; app will validate

---

### 3. Optional: Add `room_id` to Related Tables

Consider adding room_id to these tables for future features (NOT required for MVP):

```sql
-- If floor plans should be room-specific
ALTER TABLE public.floor_plan_pages
ADD COLUMN room_id UUID
  REFERENCES public.project_rooms(id)
  ON DELETE SET NULL;

-- If samples should be room-specific
ALTER TABLE public.samples
ADD COLUMN room_id UUID
  REFERENCES public.project_rooms(id)
  ON DELETE SET NULL;

-- If waypoints should be room-specific (less likely)
ALTER TABLE public.map_waypoints
ADD COLUMN room_id UUID
  REFERENCES public.project_rooms(id)
  ON DELETE SET NULL;
```

**Recommendation:** Start with **surveys only** (MVP). Add others if feature request comes in.

---

## 🔐 RLS Policies

### Add to `project_rooms` Table

```sql
ALTER TABLE public.project_rooms ENABLE ROW LEVEL SECURITY;

-- Staff: full access to all rooms
CREATE POLICY "staff_all_rooms"
  ON public.project_rooms FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read rooms for their assigned project
CREATE POLICY "client_read_rooms"
  ON public.project_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_rooms.project_id
        AND p.client_id = auth.uid()
    )
  );
```

**Why this works:**
- Clients can see rooms for their project (via parent zone check)
- Staff can manage all rooms
- Same access pattern as existing subcategories

---

## 💾 TypeScript Types

### Add `ProjectRoom` Interface

```typescript
export interface ProjectRoom {
  id: string
  project_id: string
  subcategory_id: string  // zone_id
  name: string
  description: string | null
  created_at: string
}

// Update Survey interface to include room_id
export interface Survey {
  // ... existing fields ...
  subcategory_id: string | null  // zone_id
  room_id: string | null          // NEW
}

// Update form values
export interface SurveyFormValues {
  // ... existing fields ...
  subcategory_id: string | null   // zone_id
  room_id: string | null           // NEW
}
```

---

## 🎨 UI/UX Changes

### Survey Form Page (SurveyFormPage.tsx)

**Current behavior:**
```
Project dropdown → Zone dropdown → (form fields)
```

**New behavior (for in_development projects):**
```
Project dropdown → Zone dropdown → Room dropdown (NEW) → (form fields)
```

**Implementation approach:**

```typescript
// Pseudo-code structure
const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
const [rooms, setRooms] = useState<ProjectRoom[]>([])

// When zone changes, fetch rooms for that zone
useEffect(() => {
  if (selectedZoneId) {
    loadRoomsForZone(selectedZoneId)
  } else {
    setRooms([])
    setSelectedRoomId(null)
  }
}, [selectedZoneId])

// Show room selector only if:
// 1. Rooms exist for selected zone
// 2. Project is in_development type
// 3. selectedZoneId is set
const showRoomSelector = 
  project?.project_type === 'in_development' && 
  selectedZoneId && 
  rooms.length > 0
```

**Visual layout:**
```
┌─────────────────────────────────────────┐
│ Project: [Dropdown]                     │
│ Area Name: [Input]                      │
│ Queue / Zone: [Dropdown]                │
│ Room (Optional): [Dropdown] ← NEW       │
│ Survey Date: [Date]                     │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Label:** "Room (Optional)" (clarifies it's optional)

---

### Survey Detail Pages

**Staff view (SurveyDetailPage.tsx):**
- Display: `Zone: [zone name] > Room: [room name]` (if room exists)
- Edit form same as above with room selector

**Client view (ClientSurveyDetailPage.tsx):**
- Display: `Room: [room name]` (read-only breadcrumb)
- Optional: change to show `Zone > Room` hierarchy

---

### Room Management UI (Future, Phase 2)

Not required for MVP, but structure should support:
- Zone detail page → "Manage Rooms" section
- Add/edit/delete rooms within zone
- Move surveys between rooms (if needed later)

---

## 🔌 Service Layer Changes

### New Service: `services/rooms.ts`

```typescript
// Get rooms for a specific zone
export async function getRoomsByZone(subcategoryId: string): Promise<ProjectRoom[]> {
  const { data, error } = await supabase
    .from('project_rooms')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('name')
  
  if (error) throw error
  return data || []
}

// Create a room
export async function createRoom(
  projectId: string,
  subcategoryId: string,
  name: string,
  description?: string
): Promise<ProjectRoom> {
  const { data, error } = await supabase
    .from('project_rooms')
    .insert({
      project_id: projectId,
      subcategory_id: subcategoryId,
      name,
      description: description || null,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Update room (for future management UI)
export async function updateRoom(roomId: string, updates: Partial<ProjectRoom>) {
  const { data, error } = await supabase
    .from('project_rooms')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Delete room
export async function deleteRoom(roomId: string) {
  const { error } = await supabase
    .from('project_rooms')
    .delete()
    .eq('id', roomId)
  
  if (error) throw error
}
```

### Update Surveys Service

```typescript
// Add room_id to survey creation/update
export async function createSurvey(
  projectId: string,
  data: {
    // ... existing fields ...
    subcategory_id?: string | null
    room_id?: string | null  // NEW
  },
  createdBy: string
): Promise<Survey> {
  // ... existing logic ...
  // Ensure if room_id is set, user must have access to parent zone
  // Validation: room.project_id === projectId
}
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Types (Day 1)
- [ ] Create migration 024 (project_rooms table)
- [ ] Add room_id to surveys table
- [ ] Add RLS policies
- [ ] Update TypeScript types (ProjectRoom interface + Survey.room_id)
- [ ] Create rooms.ts service file
- [ ] Verify migration runs cleanly in Supabase

### Phase 2: Survey Form UI (Day 2)
- [ ] Update SurveyFormPage.tsx to:
  - Load rooms when zone changes
  - Show room selector (conditional on project_type)
  - Handle room_id in form submission
- [ ] Update survey schema validation to include room_id
- [ ] Test creating surveys with/without rooms
- [ ] Test editing surveys (room_id preserved)

### Phase 3: Survey Display (Day 2)
- [ ] Update SurveyDetailPage to show room breadcrumb
- [ ] Update SurveysPage listing to show room (if present)
- [ ] Update ClientSurveyDetailPage to show room (if present)

### Phase 4: Testing & Polish (Day 3)
- [ ] Test backward compatibility (old surveys without room_id)
- [ ] Test RLS policies (staff can see/edit, clients can read)
- [ ] Test cascading deletes (zone deleted → room.room_id stays, zone → survey unaffected)
- [ ] Test room filtering in surveys list (future enhancement)
- [ ] Deploy to Azure and verify in UI

---

## 🚨 Migration & Data Integrity

### Backward Compatibility
✅ All existing surveys will have `room_id = NULL` (optional)  
✅ No data loss when adding room_id column  
✅ Existing queries work unchanged  

### Migration Order
1. Create `project_rooms` table (depends on project + subcategories, which exist)
2. Add `room_id` FK to surveys (safe, nullable)
3. Add RLS policies
4. Deploy code changes (service + UI)
5. Test end-to-end in Azure

### Rollback Plan
If needed, migration is reversible:
- Remove room_id column from surveys
- Drop project_rooms table
- Revert code changes

---

## 🎯 Future Enhancements (Phase 2+)

1. **Room Management UI** — Zone detail page with "Manage Rooms" section
2. **Room Filtering** — Filter surveys by room in list views
3. **Floor Plans by Room** — Link floor plans to specific rooms
4. **Waypoint Organization** — Waypoints belong to rooms for spatial clarity
5. **Mobile View** — Room breadcrumb in mobile survey views
6. **Batch Operations** — Move multiple surveys between rooms

---

## 🔗 Related Documentation

- [[richco-site-survey-current-state]] — App current state
- [[localhost-servers-not-functional]] — Test via Azure
- [[project-setup]] — Two-app separation (Site Survey vs TimeCard)

---

## 📝 Notes for Implementation

**Key decisions made:**
- Rooms are zone-specific (always belong to subcategory)
- Room linkage is optional per-survey (backward-compatible)
- Only for in_development projects (future constraint if needed)
- RLS follows parent zone access pattern
- MVP focuses on surveys only (other tables can be added later)

**Testing strategy:**
1. Create development project
2. Create zones with multiple rooms
3. Create surveys with and without rooms
4. Verify UI shows room selector only for dev projects
5. Verify client can see surveys with rooms
6. Test deletion cascade (room deleted → survey.room_id becomes NULL)

