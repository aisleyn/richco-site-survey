---
name: Client Floor Plan Redesign - May 2026
description: Complete redesign of client floor plan experience with PhaserMap, photo uploads, survey viewing, and waypoint creation
type: project
originSessionId: 5fdb2ba2-993e-4e9d-952a-bfbc8ebcf9f6
---
## Completed Features (Build 77)

### Core Map Improvements
- **Switched from Leaflet to PhaserMap** - ClientFloorPlanPage now uses PhaserMap (phaser component) instead of old InteractiveMap (Leaflet)
- **Two separate pages exist:**
  - `/client/floor-plan` - NEW PhaserMap version (correct)
  - `/client/map/:projectId` - OLD Leaflet version (ClientMapPage - deprecated)
- **Dashboard button fixed** - "View Floor Plan Map" now routes to `/client/floor-plan` not `/client/map/:id`

### Repair Request Creation
- **"Add Repair Request" button** - Clients can click button to enable waypoint placement mode on map
- **Waypoint placement** - Click on map to place new repair markers
- **Auto-submit** - Placing waypoint opens submission modal with photo upload

### Photo Upload (Mobile-Optimized)
- **Large tap-friendly button** - "📸 Add Photos (Optional)" with generous padding (p-4)
- **Camera preference** - `capture="environment"` attribute for rear camera on mobile
- **Photo preview grid** - 3 columns on mobile, 4 on desktop
- **Remove photos** - Tap any preview to remove before submitting
- **Multi-select** - Can upload multiple photos at once

### Survey Navigation (Updated May 11, 2026)
- **Clicking repairs** - Navigates to `/client/surveys/:projectId` list instead of showing modal
- **ClientSurveysPage** - New dedicated page showing all surveys for project (similar to staff SurveysPage)
- **Survey categories:**
  - Active (draft status) - expandable/collapsible
  - Temporarily Completed (published status)
  - Permanently Completed (archived status)
- **Backend API** - Uses `/api/surveys-by-ids` endpoint (server.js) with service role to bypass RLS restrictions
- **Survey detail view** - Click survey card to navigate to `/client/surveys/:projectId/detail/:surveyId`
- **Conditional staff features** - SurveyDetailPage uses role checking to hide staff-only buttons (edit, publish, etc.) for clients

### UI/Styling
- **Right sidebar for repairs** - "Repair Locations" sidebar on right side of map (fixed width w-64)
- **Card styling** - White background (#fbfbfb) matching staff edit button colors
- **Removed title** - "Repair Locations" h2 title removed from sidebar
- **Status color dots** - Red (needs_repair), yellow (in_progress), blue (temporary_repair), green (permanent_repair/completed)

## Technical Implementation Details

### Services Used
- `getWaypointsByProject` - Fetch waypoints
- `createWaypoint` - Create new waypoints with auto status 'needs_repair'
- `submitWaypointPhoto` - Upload photos to Supabase storage (waypoint-photos bucket)
- `updateSubmissionWaypoint` - Link waypoints to client submissions
- `getSurveyById`, `getSurveyMedia` - Fetch survey details and media
- `getSurveyUpdates` - Fetch survey updates from staff

### State Management
- `isPlacingWaypoint` - Toggle waypoint placement mode
- `newWaypointCoords` - Store coords {x, y} from map click
- `selectedPhotos` - Store File[] for upload
- `isSurveyModalOpen`, `selectedSurvey`, `surveyUpdates`, `surveyMedia` - Survey view state

### Key Routes
- `/client` - Dashboard (ClientDashboard)
- `/client/floor-plan` - PhaserMap with repairs list ✓
- `/client/surveys/:projectId` - Survey list for project (NEW)
- `/client/surveys/:projectId/detail/:surveyId` - Survey detail view (shared with staff)
- `/client/map/:projectId` - OLD Leaflet version (deprecated)
- `/client/submit` - Submit repair request form
- `/client/flipbook` - View reports
- `/client/profile` - Client profile

## RLS Bypass for Client Survey Viewing

**Problem:** Clients cannot directly query surveys table due to Supabase RLS policies
**Solution:** Backend endpoint `/api/surveys-by-ids` (server.js) uses service role key to fetch surveys
**Flow:**
1. ClientSurveysPage gets waypoints via `getWaypointsByProject()`
2. Extracts linked_survey_ids from waypoints
3. POSTs to `http://localhost:3002/api/surveys-by-ids` with surveyIds array
4. Server queries Supabase as admin (service role), returns all survey fields
5. Client displays surveys grouped by status with expandable categories

## Deployment Issues & Solutions

### Issue 1: Soft Reset Lost Changes
**Problem:** Combined 20+ commits into one using `git reset --soft d7951ea`, but d7951ea was BEFORE dashboard route fix and photo upload additions
**Solution:** Code was already correct in combined commit 72acda5, but Azure hadn't deployed latest version
**Fix:** Triggered fresh deployment with empty commit (Build 77)

### Issue 2: Build Failures (Builds 70-75)
**Initial cause:** Multiple small commits led to slow individual deployments
**Solution:** Combined all changes into single commit 72acda5 with proper TypeScript fixes:
- Removed unused `getSurveyUpdateMedia` import
- Removed unused `SurveyUpdateMedia` type  
- Fixed `handleWaypointAdd` callback signature from `(coords: {x, y})` to `(xPercent, yPercent)`

### Issue 3: Azure Not Updating
**Problem:** Code correct in git but Azure deployment showed old version
**Cause:** Deployment cache or version lag
**Solution:** Pushed empty commit to trigger fresh build #77

## Files Modified
- `src/pages/client/ClientFloorPlanPage.tsx` - Main page with all features (+482 lines)
- `src/pages/client/ClientDashboard.tsx` - Fixed dashboard button route

## Testing Checklist
- [ ] Dashboard button goes to `/client/floor-plan`
- [ ] "Add Repair Request" button visible on map
- [ ] Click button → enters placement mode → "Click to place marker..." text
- [ ] Click map → modal opens with photo upload
- [ ] Photo upload shows "📸 Add Photos" button
- [ ] Can select multiple photos, see preview grid, remove individual photos
- [ ] Submit creates waypoint + client submission + links them
- [ ] Click waypoint with linked survey → shows report modal
- [ ] Report shows survey notes, updates, photos
- [ ] "Submit Repair Request" button available from survey view
- [ ] Right sidebar shows repair cards with white background
- [ ] Status color dots show correct colors

## Notes for Future Work
- ClientMapPage (old Leaflet) could be deprecated/removed once confirmed all clients using new route
- Photo upload service uses Supabase storage bucket "waypoint-photos"
- Survey updates fetched separately from main survey - useful for showing change history
- PhaserMap expects number coordinates (xPercent, yPercent), not object
