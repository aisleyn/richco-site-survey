---
name: richco_zone_list_implementation
description: "Zone list feature with per-zone surveys, floor plans, and samples for Richco Site Survey app"
metadata: 
  node_type: memory
  type: project
  originSessionId: e2dcc4b4-3340-4fce-827b-72c1f40549a4
---

# Zone List Feature Implementation — May 26, 2026

## Overview
Implemented individual zone list views for projects with zones. Each zone is now a clickable item in a dedicated "Zones" tab, navigating to a zone detail page with its own surveys, floor plan uploads, and samples.

**Commit:** `2d63cc9` - "Implement zone list with per-zone surveys, floor plans, and samples"
**Status:** ✅ Deployed to Azure on May 26, 2026

## Architecture Changes

### Database Migration
Created `supabase/migrations/020_add_zone_linkage.sql`:
- Added `subcategory_id UUID` column to `floor_plan_pages` table
- Added `subcategory_id UUID` column to `samples` table
- Both reference `project_subcategories(id)` with ON DELETE SET NULL
- Added indexes for performance: `idx_floor_plan_pages_subcategory`, `idx_samples_subcategory`

### Type Updates (`src/types/index.ts`)
- `FloorPlanPage`: Added `subcategory_id: string | null`
- `Sample`: Added `subcategory_id: string | null`

### Service Layer Updates

**`src/services/floorPlanPages.ts`**
- `getFloorPlanPagesByProject(projectId, zoneId?)` - optional zone filter
- `createFloorPlanPage(..., subcategoryId?)` - optional zone linkage on creation

**`src/services/samples.ts`**
- `getSamplesByProject(projectId, zoneId?)` - optional zone filter
- `createSample(..., subcategoryId?)` - optional zone linkage on creation

### New Components

**`src/components/project/ZoneList.tsx`**
- Displays zones as navigable list (not tile grid)
- Each row shows: zone name, status badge, counts of surveys/floor plans/samples
- Click navigates to zone detail page via Link to `/staff/projects/:projectId/zones/:zoneId`
- Maps zone status to compatible badge variants (concept→default, in_development→in_progress, approved→completed, denied→needs_repair, on_hold→temporary_repair)

**`src/pages/staff/ZoneDetailPage.tsx`**
- New route: `/staff/projects/:projectId/zones/:zoneId`
- Three tabs: Surveys | Floor Plans | Samples
- **Surveys tab:** Lists zone's surveys, "New Survey" button
- **Floor Plans tab:** 
  - Thumbnail grid of zone floor plans
  - "Upload Floor Plan" button (opens PdfUploadModal with zone ID)
  - "Open Interactive Map" button → `/staff/projects/:projectId/map?zone=zoneId`
- **Samples tab:** Grid of SampleCards, "Add Sample" button (opens SampleCreateModal with zone ID)
- Back button uses BackButton component which automatically routes back to project

### Updated Components

**`src/pages/staff/ProjectDetailPage.tsx`**
- Removed activeZoneId search-param drill-down pattern
- Added "Zones" tab that appears whenever `subcategories.length > 0`
- Auto-switches to Zones tab on project load if zones exist
- Zones tab shows ZoneList component with all zone data
- Removed unused: ZoneTileGrid import, searchParams, setSearchParams

**`src/pages/staff/MapPage.tsx`**
- Added zone filtering via `?zone=zoneId` query parameter
- Uses `useSearchParams()` to read zone filter
- `filteredWaypoints` now filters by: `(!zoneFilter || wp.subcategory_id === zoneFilter)`
- `filteredFloorPlans` filters floor plan pages by zone when filter active
- Shows zone breadcrumb: "ZoneName • X waypoints"
- Floor plan page selection and map rendering use filtered lists
- Passes waypoints filtered to both status AND zone

**`src/components/samples/SampleCreateModal.tsx`**
- Added optional `subcategoryId?: string` prop
- Passes subcategoryId to `createSample()` as 4th parameter

**`src/components/map/PdfUploadModal.tsx`**
- Added optional `subcategoryId?: string` prop
- Added optional `onFloorPlanCreated?: (page: FloorPlanPage) => void` callback
- Passes subcategoryId to both image and PDF `createFloorPlanPage()` calls
- Calls `onFloorPlanCreated()` after each page created (for live update in ZoneDetailPage)

**`src/router/index.tsx`**
- Added import for ZoneDetailPage
- New route: `{ path: 'projects/:projectId/zones/:zoneId', element: <ZoneDetailPage /> }`

## User Workflows

### Viewing Zones
1. Open project detail page
2. If project has zones, "Zones" tab appears and is auto-selected
3. See list of zones with counts
4. Click zone → navigate to zone detail page

### Zone Detail Page
1. See zone name + status badge + back button to project
2. View three tabs:
   - **Surveys:** All surveys for this zone, create new survey button
   - **Floor Plans:** Upload PDFs/images specific to zone, or open interactive map with zone waypoints
   - **Samples:** Add samples specific to zone, see samples only from this zone

### Floor Plans per Zone
1. In ZoneDetailPage Floor Plans tab, click "Upload Floor Plan"
2. PdfUploadModal opens with zone pre-selected
3. Upload PDF or image → creates floor plan linked to zone
4. Thumbnail appears in zone's floor plan list
5. Click "Open Interactive Map" → MapPage with zone filter applied
6. Only zone's waypoints and floor plans visible on map

### Samples per Zone
1. In ZoneDetailPage Samples tab, click "Add Sample"
2. SampleCreateModal opens with zone pre-selected
3. Create sample → sample linked to zone
4. Sample appears in zone's samples list only (not in other zones)

## Key Design Decisions

**Why clickable zones over tile grid?**
- Tile grid was visual but limited to development projects only
- List view works for all project types and scales better
- Cleaner navigation pattern with dedicated detail page

**Why per-zone floor plans and samples?**
- User requested "each zone has its own... floor plan maps and samples"
- Requires DB schema change but provides clear organization
- Zone-specific uploads make sense for construction projects with multiple areas

**Why query parameter for MapPage zone filtering?**
- MapPage already existed and was project-level
- Query param allows reusing MapPage without duplicating code
- Clean URL pattern: `/map?zone=zoneId`

**Why dedicated detail page vs inline drill-down?**
- User preference: "Click to drill in" option chosen during planning
- More content (3 tabs) than fits in drill-down pattern
- Cleaner routing with dedicated page component
- Consistent with other detail pages in app (SurveyDetailPage, etc.)

## Testing Notes

Build and deployment successful:
- TypeScript compilation: ✅ No errors
- Vite build: ✅ Successful
- GitHub push: ✅ Pushed to main branch
- Azure deployment: ✅ Triggered (5-10 min estimated)

Deployed to: `richco-site-survey-b4b3g5aehzc5fjgb.centralus-01.azurewebsites.net`

**Manual Testing Checklist:**
- [ ] Database migration applied to Supabase
- [ ] Project with zones shows "Zones" tab
- [ ] Zones list displays all zones with counts
- [ ] Click zone → navigates to detail page
- [ ] Detail page shows 3 tabs
- [ ] Create survey in zone → appears in Surveys tab only
- [ ] Upload floor plan → appears in zone's Floor Plans tab
- [ ] "Open Map" button → shows zone waypoints only
- [ ] Add sample → appears in zone's Samples tab only
- [ ] Sample from zone A does NOT appear in zone B

## Files Changed
- `supabase/migrations/020_add_zone_linkage.sql` (new)
- `src/types/index.ts` (2 interfaces updated)
- `src/services/floorPlanPages.ts` (2 functions updated)
- `src/services/samples.ts` (2 functions updated)
- `src/components/project/ZoneList.tsx` (new)
- `src/pages/staff/ZoneDetailPage.tsx` (new)
- `src/pages/staff/ProjectDetailPage.tsx` (major refactor)
- `src/pages/staff/MapPage.tsx` (zone filtering added)
- `src/components/samples/SampleCreateModal.tsx` (prop added)
- `src/components/map/PdfUploadModal.tsx` (props added)
- `src/router/index.tsx` (route added)

**Total:** 12 files changed, 521 insertions, 162 deletions
