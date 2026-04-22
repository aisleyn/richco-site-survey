# Deployment & Setup Guide

## Prerequisites

- Supabase project (created in Phase 1)
- Vercel or Netlify account (for frontend deployment)
- Resend account (free at https://resend.com)

## Phase 1: Frontend Deployment

### Deploy to Vercel

1. Push code to GitHub:
   ```bash
   git add -A
   git commit -m "Initial Richco Site Survey commit"
   git push -u origin main
   ```

2. Import on Vercel:
   - Go to https://vercel.com/new
   - Import from GitHub
   - Set environment variables:
     ```
     VITE_SUPABASE_URL=https://[project].supabase.co
     VITE_SUPABASE_ANON_KEY=[your-anon-key]
     ```
   - Deploy

### Deploy to Netlify

1. Connect GitHub repo
2. Set environment variables in Site Settings → Build & Deploy → Environment
3. Deploy

## Phase 2: Supabase Edge Functions (for emails)

### 1. Set up Resend

- Create account at https://resend.com
- Get your API key from the dashboard
- Keep this secret!

### 2. Deploy Edge Function

```bash
# Link your Supabase project (if not already linked)
supabase link --project-ref [your-project-id]

# Create edge function
supabase functions new send-email

# Copy the code from supabase/functions/send-email/index.ts into the generated file

# Set Resend API key as secret
supabase secrets set RESEND_API_KEY="your-resend-api-key"

# Deploy
supabase functions deploy send-email
```

### 3. Update Function URL in Client Code

Get your deployed function URL from Supabase dashboard:
- Go to Functions section
- Copy the `send-email` function URL
- It should look like: `https://[project-ref].functions.supabase.co/send-email`

The client code will automatically call this URL via `supabase.functions.invoke('send-email', ...)`

## Phase 3: Email Configuration

### Update Email Domain (Optional but Recommended)

By default, emails are sent from `noreply@richco-site-survey.com`. To use a custom domain:

1. In Resend dashboard, add your domain (e.g., `noreply@yourcompany.com`)
2. Update `FROM_EMAIL` in `supabase/functions/send-email/index.ts`
3. Redeploy function

### Test Email Sending

1. Sign in as client
2. Submit a repair request
3. Check the staff email inbox (should receive notification within 1-2 minutes)

## Phase 4: Database Backups

### Enable Automated Backups

In Supabase dashboard:
1. Go to Project Settings → Backups
2. Enable automatic daily backups
3. Configure retention period

### Manual Backup

```bash
supabase db pull
```

This creates a schema dump you can commit to git.

## Monitoring & Troubleshooting

### Check Edge Function Logs

```bash
supabase functions logs send-email
```

### Common Issues

**Email not sending:**
- Check that RESEND_API_KEY is set: `supabase secrets list`
- Verify Resend account has credits
- Check function logs for errors

**Client can't access app:**
- Verify Supabase ANON_KEY in environment variables
- Check CORS settings in Supabase dashboard

**High latency:**
- Consider enabling Vercel Analytics
- Check Supabase database query performance

## Security Checklist

✅ Never commit `.env.local` to git  
✅ Rotate Supabase anon key if exposed  
✅ Use strong passwords for all accounts  
✅ Enable 2FA on Vercel/Netlify/Resend accounts  
✅ Regularly review database backups  
✅ Monitor RLS policies for data leakage  

## Ongoing Maintenance

- Monitor Vercel/Netlify deployment logs weekly
- Review Supabase edge function logs for errors
- Update npm packages monthly: `npm update`
- Test email notifications after Resend updates
- Verify backups are completing successfully

## Cost Estimates (Monthly)

- **Supabase:** ~$25-50 (with realistic usage)
- **Vercel:** ~$20 (Pro plan with serverless functions)
- **Resend:** $25 for 100k emails/month
- **Total:** ~$70-95/month

Adjust based on your usage patterns.
