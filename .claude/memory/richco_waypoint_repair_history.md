---
name: Richco Waypoint Repair History Feature
description: Status change history now included in waypoint reports as bullet points
type: project
originSessionId: ad59ffd0-4616-4620-85e9-49f705b95d6c
---
## Implementation Complete (2026-05-04)

**Feature:** Waypoint repair status change history now displays in generated reports as bullet points beneath the waypoint screenshot.

## How It Works

**During Publish:**
- Repair history is fetched from waypoint_repair_history table
- Saved to survey_update.waypoint_location_json before waypoint deletion
- Preserves data through CASCADE delete

**Report Generation:**
- History extracted from waypointLocation data
- Formatted as bullet points: "Status on Date. Notes: ..."
- Template displays below waypoint screenshot

## Technical Details

**Files Modified:**
- `src/pages/staff/SurveyDetailPage.tsx` — Fetch & save history during publish; use embedded history during report download
- `src/lib/templateExport.ts` — Added WaypointHistoryEntry type
- `scripts/fill_template.py` — Added bullet point rendering for repair history

**Database:**
- waypoint_repair_history table has: id, waypoint_id, old_status, new_status, changed_by, changed_at, notes
- Survey updates cascade waypoint_id to NULL on waypoint deletion (doesn't affect saved history)

## Testing Checklist

- [ ] Create waypoint
- [ ] Change status: needs_repair → in_progress → completed (add notes each time)
- [ ] Publish survey (captures history before delete)
- [ ] Download report
- [ ] Verify bullet points appear with dates and notes

## Known Behavior

- History only appears if waypoint has a floor plan page/screenshot
- If waypoint deleted without publishing, history is not saved to report
- Fallback: if history not embedded, code tries to fetch from DB (won't work post-delete)
