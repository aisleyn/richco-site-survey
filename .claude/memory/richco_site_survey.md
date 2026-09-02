---
name: Richco Site Survey Project
description: Live survey application with mobile responsiveness, PDF export, and dashboard UI updates as pending work
type: project
originSessionId: de2899cd-e41b-461a-9bf0-2102218a28dc
---
## Project Status
- **Status:** Live and running well
- **Date:** Last session 2026-04-28

## Recent Work (2026-04-28 & 2026-04-29)

1. **PWA & Mobile Improvements**
   - Added PWA support for mobile installation
   - Fixed iOS PWA routing (handle 404 on home screen launch)
   - PWA now installable on mobile devices
   - Enhanced mobile map zooming with pinch-to-zoom and drag-to-zoom (2-finger drag)

2. **Map Zoom Gestures (2026-04-29)**
   - Enabled explicit pinch-to-zoom (touchZoom: true)
   - Added drag-to-zoom using two-finger vertical drag
   - Replaces double-tap as primary zoom method on mobile
   - Implemented in setupDragToZoom() function

3. **Account Management**
   - Added delete-user-by-email endpoint and helper function
   - Fixed CORS headers for delete-by-email function
   - Reorganized account management features
   - Fixed profile record creation when adding clients

4. **PDF Report Fixes**
   - Fixed PDF display in downloaded reports
   - Improved media handling

5. **Code Cleanup**
   - Removed unused state variables

## Completed Work (2026-04-29 & 2026-04-30)

### PDF & Document Management
- **Fixed PDF upload mobile errors** — Moved PDF.js worker from CDN to local file for reliable mobile access
- **Multi-page PDF viewer** — Added full page navigation to MediaPreviewModal with:
  - Previous/Next buttons
  - Direct page number input (jump to page)
  - Page counter display
  - Download button for each PDF
  - Proper rendering using PDF.js canvas rendering

### Document Upload Behavior
- **Floor plan upload**: PDFs converted to PNG (first page) for map background
- **Survey media upload**: PDFs kept in original format (no conversion)
- Full multi-page PDF support for survey media with page navigation

### Waypoint Status & Survey Linking
- **Survey ID tracking** — Repair history now includes survey_id to track which survey caused status changes
- **Required survey for updates** — Prevents marking waypoints as "in_progress" or "completed" without a linked survey
- **Display linked surveys** — Shows "📋 Linked to survey" indicator in repair history entries
- **Survey validation** — Toast error if user tries to change status without linking survey first

### Waypoint Deletion
- **Delete at any status** — Waypoints can be deleted at needs_repair, in_progress, or completed status
- **Preserve survey history** — Deleting a waypoint does NOT delete associated surveys or survey_updates
- **Database constraint** — Modified survey_updates.waypoint_id foreign key to ON DELETE SET NULL
- **Clean waypoint records** — Removes waypoint photos, notes, and repair history when waypoint is deleted

## Known Completed Items
- Mobile responsiveness implemented and tested
- Button text updated ("Open Dashboard" → "Create Survey")
- Map zoom gestures (pinch and drag-to-zoom)

## Tech Stack Notes
- Related to Richco floor plan upload system (same codebase area)
- Uses Supabase backend
- Leaflet.js for mapping features
