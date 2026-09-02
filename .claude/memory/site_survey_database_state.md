---
name: site-survey-database-state
description: Site Survey database has Richco App migrations mixed in - documented as known state
metadata:
  type: project
---

# Site Survey Database State (2026-08-14)

## 🟡 KNOWN ISSUE: Mixed Database Schema

**What happened:**
- User accidentally pasted all Richco App migrations (001-024) into Site Survey App's Supabase SQL editor
- All migrations ran successfully
- User also synced via terminal
- Decision: Leave as-is (safest approach)

## 📊 Database Details

**Site Survey Supabase Project:**
- URL: `https://xwpghxnyhqqafgwumejt.supabase.co`
- Now contains: Original Site Survey schema + Richco App tables (crew_members, users, shifts, time_entries, notifications, etc.)

**Richco App Supabase Project:**
- URL: `https://rsomamqswbezhcaprbol.supabase.co`
- Separate, clean database

## ✅ Status

- Site Survey App still functional (extra tables don't interfere)
- Extra Richco tables are just database clutter
- No action needed - leave as documented

## 🔮 Future Consideration

If database cleanup becomes necessary:
1. Restore from backup (safest)
2. Or selectively drop Richco tables if needed
3. Or accept as-is if it never becomes an issue

**Date Documented:** 2026-08-14
