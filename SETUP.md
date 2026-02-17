# Quick Setup Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
cd smart-bookmark-app
npm install
```

### Step 2: Create Supabase Project (2 min)
1. Go to https://supabase.com → "New Project"
2. Name it "smart-bookmarks", set a password
3. Wait for project to be ready (~2 min)

### Step 3: Set Up Database (1 min)
1. In Supabase: Click "SQL Editor" → "New Query"
2. Copy-paste this SQL and click "Run":

```sql
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on bookmarks for delete using (auth.uid() = user_id);

create index bookmarks_user_id_idx on bookmarks(user_id);

alter publication supabase_realtime add table bookmarks;
```

### Step 4: Enable Google Auth (1 min)
1. In Supabase: Go to "Authentication" → "Providers"
2. Enable "Google"
3. Copy the callback URL shown

### Step 5: Create Google OAuth Credentials (3 min)
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. If prompted, configure consent screen (just fill app name)
6. Choose "Web application"
7. Add these redirect URIs:
   - `https://[your-project].supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback`
8. Copy Client ID and Client Secret
9. Paste them back into Supabase Google provider settings

### Step 6: Configure Environment (30 sec)
1. Copy `.env.local.example` to `.env.local`
2. Get your Supabase URL and anon key from: Settings → API
3. Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 7: Run Locally (30 sec)
```bash
npm run dev
```
Open http://localhost:3000 🎉

### Step 8: Deploy to Vercel (2 min)
1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin [your-repo-url]
git push -u origin main
```

2. Go to https://vercel.com → "New Project"
3. Import your GitHub repo
4. Add environment variables (same as `.env.local`)
5. Click "Deploy"
6. Done! Your app is live 🚀

## 🐛 Troubleshooting

**"Invalid grant" error when signing in**
→ Check that Google OAuth redirect URI matches Supabase callback URL exactly

**Bookmarks not appearing**
→ Check browser console for errors
→ Verify RLS policies are set up correctly

**Real-time not working**
→ Make sure you ran the `alter publication` SQL command
→ Check that you're filtering by user_id in the subscription

**Can see other users' bookmarks**
→ RLS policies missing - re-run the SQL setup

## 📱 Testing Real-time Sync

1. Open your app in two different browser tabs
2. Sign in with the same Google account in both
3. Add a bookmark in one tab
4. Watch it appear instantly in the other tab! ✨

## 🎨 UI Features

- **Beautiful gradient background** - Modern blue/indigo theme
- **Smooth animations** - Hover effects and transitions
- **Responsive design** - Works on mobile, tablet, desktop
- **Loading states** - Spinners for better UX
- **Empty states** - Helpful messages when no bookmarks
- **Delete confirmation** - Hover to reveal delete button

## 🔐 Security Features

- ✅ Row Level Security (RLS) - Users can only access their own data
- ✅ Google OAuth - No passwords to manage
- ✅ Environment variables - Secrets not in code
- ✅ HTTPS only - Secure connections
- ✅ Cascade delete - Bookmarks removed when user deleted

## ✅ All Requirements Met

1. ✅ Google OAuth (no email/password)
2. ✅ Add bookmarks (URL + title)
3. ✅ Private bookmarks (RLS policies)
4. ✅ Real-time updates (Supabase Realtime)
5. ✅ Delete bookmarks
6. ✅ Deployed on Vercel

Enjoy your new bookmark manager! 🎉
