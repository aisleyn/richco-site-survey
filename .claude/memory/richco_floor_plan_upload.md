---
name: Richco Floor Plan Upload Methods
description: Two ways to set floor plan images for map displays - UI-based PDF upload or direct database pathway
type: reference
originSessionId: 435e960c-c580-4d42-b556-a503c494394b
---
## Floor Plan Upload for Richco Site Survey

The application supports two methods for adding floor plan images to projects:

### Method 1: UI Upload (Built-in PDF Conversion)
1. Navigate to **Projects** → click project name
2. Click **"Floor Plan Map"** button (top right)
3. Click **"📄 Upload Floor Plan"** button
4. Select PDF file
5. Click "Upload & Convert" → Automatically converts first page to image

**Location:** `/staff/projects/:projectId/map`

### Method 2: Direct Database Update (Fastest)
Execute in Supabase SQL Editor:

```sql
UPDATE public.projects 
SET map_image_url = 'https://your-image-url-here.jpg'
WHERE id = 'your-project-id';
```

**Image requirements:**
- PNG, JPG, or other image format
- Must be publicly accessible OR use Supabase signed URL
- Can pre-convert PDFs via CloudConvert or similar tools

**Field location:** `projects.map_image_url` (nullable text field)

## Technical Details
- PDF conversion uses `pdfjs-dist` library on client-side
- Converted images stored in `floor-plans` Supabase bucket
- Images accessible via signed URLs (1 hour expiry default)
- Map uses Leaflet.js with CRS.Simple (percentage-based coordinates, not lat/lng)
