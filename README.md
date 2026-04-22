# Richco Site Survey — Phase 1

A full-stack web application for managing post-job site surveys for theme park queue line facilities.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v3
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **State Management:** Zustand
- **Forms:** react-hook-form + zod

## Setup Instructions

### 1. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your project URL and anon key from the project settings

### 2. Run Database Migrations

1. Open the Supabase SQL editor
2. Run the migrations in this order:
   - Copy & paste contents of `supabase/migrations/001_init_schema.sql`
   - Copy & paste contents of `supabase/migrations/002_rls_policies.sql`
   - Copy & paste contents of `supabase/migrations/003_storage_buckets.sql`

### 3. Create Storage Buckets

The buckets should be created by migration 003, but if they're not, create them manually:
- `survey-media` (private)
- `client-submission-media` (private)
- `floor-plans` (private)

### 4. Configure Environment Variables

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Create Test Users

In Supabase dashboard, create two users with test credentials and set their roles via SQL.

### 6. Install & Run

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── components/       # UI components
│   ├── ui/          # Basic components
│   ├── layout/      # Layout wrappers
│   └── auth/        # Route guards
├── pages/           # Page components
├── services/        # API operations
├── store/           # State management
├── types/           # TypeScript types
└── router/          # Route definitions
```

## Features

✅ Authentication (email/password)
✅ Role-based access (staff/client)
✅ Projects & surveys CRUD
✅ File uploads (images, videos, 3D scans)
✅ Responsive UI with Tailwind
✅ Row-level security

## Testing

**Staff:** Create project → Create survey → Publish to report
**Client:** View assigned project reports → Submit repairs (Phase 3)

## Next Phases

Phase 2: Flipbook builder
Phase 3: Email notifications
Phase 4: Interactive map
Phase 5: Polish & animations
