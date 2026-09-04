---
name: dev-page-form-submission-review-2026-09-04
description: "Development page (SurveyFormPage) and form submission review - Room hierarchy cascade integration"
metadata:
  type: project
  date: 2026-09-04
  focus: survey-form-page
  feature: room-hierarchy-cascade
  status: deployed-testing
  relates_to: room-hierarchy-completed-2026-09-02
---

# Development Page & Form Submission Review — 2026-09-04

## 📍 Context

**Recent Feature:** Room Hierarchy (Deployed 2026-09-02)  
**Latest Commit:** `b31e1ac` — "feat: Add room hierarchy within zones for surveys"  
**Status:** ✅ Deployed to Azure, awaiting end-to-end testing

---

## 🎯 The Development Page = `SurveyFormPage.tsx`

### Location
`src/pages/staff/SurveyFormPage.tsx` — Primary form for creating and editing surveys

### What It Handles
1. **Survey Creation** — New surveys from scratch
2. **Survey Editing** — Modify existing surveys
3. **Form Fields** — Title, description, status, project, zone, **room (NEW)**, etc.
4. **Form Submission** — Save survey to Supabase via `surveys.ts` service

---

## ✅ Recent Changes (Room Hierarchy Feature)

### Added to Form
**Cascading Zone > Room Selector**
```
Project Dropdown
    ↓
Zone Dropdown
    ↓
Room Dropdown (NEW - only appears if rooms exist in zone)
```

### How It Works
1. **When zone is selected:**
   - `getRoomsByZone(subcategoryId)` is called
   - Room dropdown appears IF rooms exist
   - If NO rooms exist: "No rooms in this zone. Survey will be assigned to the zone." message

2. **When zone changes:**
   - Room selection clears (prevents mismatches)
   - New rooms load for new zone

3. **When creating/editing survey:**
   - Room selection is stored in form state: `formData.room_id`
   - Passed to `createSurvey()` / `updateSurvey()` service

4. **Label:** "Room (Optional)" — clarifies it's not required

---

## 📋 Form Submission Flow

### Create New Survey
1. User fills form (project, zone, room, title, etc.)
2. Clicks "Create Survey" button
3. `handleSubmit()` collects all fields including `room_id`
4. Calls `surveys.createSurvey(surveyData)`
5. **In service:**
   - Validates room_id matches survey's project_id (safety check)
   - Inserts to `surveys` table with `room_id` field
6. **Response:** Survey created, redirect to detail page

### Edit Existing Survey
1. Survey loads with existing `room_id` (if assigned)
2. Room dropdown **pre-selects** the current room
3. User can change room or clear it
4. Clicks "Save"
5. Calls `surveys.updateSurvey(surveyId, updates)`
6. **In service:**
   - Updates only changed fields
   - `room_id` updated if changed
7. **Response:** Redirect to detail page with updated info

---

## 🔄 What Changed in Services

### `src/services/rooms.ts` (NEW)
- `getRoomsByZone(subcategoryId)` — Used by form to load room dropdown
- `getRoomById(roomId)` — Used by detail page to display room name
- CRUD functions for future room management UI

### `src/services/surveys.ts` (UPDATED)
- `createSurvey()` now accepts `room_id` parameter
- `updateSurvey()` now handles `room_id` updates
- Still fully backward compatible (room_id is optional)

---

## 📊 Database State

### New Table: `project_rooms`
```
id                   UUID (primary key)
project_id          UUID (FK to projects)
subcategory_id      UUID (FK to project_subcategories / zones)
name                TEXT (e.g., "Control Room", "Mechanical Room")
description         TEXT (optional)
status              ENUM (concept, in_development, approved, denied, on_hold)
room_order          INT (for manual ordering)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Updated Table: `surveys`
```
...existing fields...
room_id             UUID NULL (NEW, FK to project_rooms)
```

**Safety:** All `room_id` values start as NULL (backward compatible)

---

## ✅ Testing Checklist for Form & Submission

### Form Display & Cascade
- [ ] Navigate to create survey form
- [ ] Select project → zone selector appears ✅
- [ ] Select zone → check if room dropdown appears
  - [ ] Rooms exist? → Dropdown shows list ✅
  - [ ] No rooms? → "No rooms in this zone" message appears ✅
- [ ] Select room → form accepts selection ✅
- [ ] Change zone → room selection clears (prevents mismatch) ✅

### Form Submission (Create)
- [ ] Fill form with room selected
- [ ] Click "Create Survey"
- [ ] Check Supabase: `surveys` table has `room_id` set ✅
- [ ] Detail page shows "Location: Zone > Room" breadcrumb ✅

### Form Submission (Edit)
- [ ] Open survey detail page
- [ ] Click "Edit"
- [ ] Verify room dropdown pre-selects current room ✅
- [ ] Change to different room
- [ ] Click "Save"
- [ ] Check Supabase: `room_id` updated ✅
- [ ] Detail page shows new room ✅

### Backward Compatibility
- [ ] Create survey WITHOUT selecting room (leave empty)
- [ ] Verify survey creates with `room_id = NULL` ✅
- [ ] Detail page shows "Location: Zone" (no room) ✅

### Edge Cases
- [ ] Delete room from zone → survey still displays ✅
- [ ] Survey relinks to zone (room_id becomes NULL) ✅
- [ ] Form prevents selecting room from different zone ✅

---

## 🔍 Key Code Files to Review

### Form Submission Logic
- `src/pages/staff/SurveyFormPage.tsx` — Main form component
  - Look for: `getRoomsByZone()` calls, `room_id` state management, `handleSubmit()`
  - Room dropdown should only render when rooms exist

- `src/services/surveys.ts` — Service layer
  - `createSurvey()` should pass `room_id` to Supabase insert
  - `updateSurvey()` should handle `room_id` updates
  - Validation: room_id must belong to survey's project

### Display & Detail
- `src/pages/staff/SurveyDetailPage.tsx` — Shows submitted survey
  - Should display "Location: Zone > Room" breadcrumb
  - Uses `getRoomById()` to load room name

- `src/types/index.ts` — TypeScript definitions
  - `SurveyFormValues` should include `room_id: string | null`
  - `Survey` interface should have `room_id: string | null`

---

## ⚠️ Known Issues & Debugging

### If Room Dropdown Doesn't Show
1. Check: Does selected zone have rooms in database?
   ```sql
   SELECT * FROM project_rooms WHERE subcategory_id = 'ZONE_ID';
   ```
2. Check browser console (F12) for API errors
3. Verify `getRoomsByZone()` returns non-empty array

### If Room ID Not Saving
1. Check: `createSurvey()` passes `room_id` param to Supabase
2. Check: `survey.room_id` column exists in database
3. Open DevTools Network tab → inspect POST request to `/surveys`

### If Detail Page Doesn't Show Room
1. Check: `room_id` is actually in database
   ```sql
   SELECT id, title, room_id FROM surveys WHERE id = 'SURVEY_ID';
   ```
2. Check: `getRoomById()` is being called in `SurveyDetailPage.tsx`
3. Check browser console for errors

---

## 🚀 Next Steps

### Immediate (Testing - Today)
1. ✅ Deploy confirmed live on Azure
2. ✅ Test creating survey with room
3. ✅ Test editing survey and changing room
4. ✅ Test backward compatibility (no room)
5. ✅ Verify database rows have correct `room_id` values

### Phase 2 (Future)
- [ ] Room management UI (create/edit/delete rooms in app)
- [ ] Survey filtering by room
- [ ] Zone detail page with "Manage Rooms" section
- [ ] Mobile view improvements for room breadcrumbs

---

## 📚 Related Documentation

**Completed Today:**
- `room_hierarchy_completed_2026_09_02.md` — Full feature summary
- `room_hierarchy_feature_plan.md` — Design decisions

**Testing Plan:**
- `tomorrow_prompt_2026_09_02_site_survey_rooms.md` — 5 test cases to run

**Database:**
- `site_survey_database_state.md` — Current schema state

---

## 🎯 Summary

**What's new in form submission:**
1. Room dropdown cascades from zone selection
2. Room selection is optional (backward compatible)
3. Form passes `room_id` to `createSurvey()` and `updateSurvey()`
4. Database stores `room_id` in surveys table

**What's critical to test:**
1. Cascade works: zone selected → rooms load
2. Form submission saves `room_id` to database
3. Detail page displays room breadcrumb correctly
4. Surveys without room still work (backward compat)
5. No console errors during submission

**Status:** Ready for end-to-end testing on Azure deployment ✅

---

**Created:** 2026-09-04  
**Related:** [[room-hierarchy-completed-2026-09-02]], [[richco-site-survey-current-state]]
