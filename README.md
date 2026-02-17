# Smart Bookmark Manager

A modern, real-time bookmark manager built with Next.js 14, Supabase, and Tailwind CSS. Features Google OAuth authentication, real-time synchronization, and a beautiful, responsive UI.

## Features

✅ **Google OAuth Authentication** - Secure, passwordless sign-in
✅ **Private Bookmarks** - Each user sees only their own bookmarks
✅ **Real-time Sync** - Changes appear instantly across all open tabs
✅ **CRUD Operations** - Add, view, and delete bookmarks
✅ **Responsive Design** - Beautiful UI that works on all devices
✅ **Deployed on Vercel** - Production-ready with live URL

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Project Structure

```
smart-bookmark-app/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main application page
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Client-side Supabase client
│   │   └── server.ts             # Server-side Supabase client
│   └── types.ts                  # TypeScript interfaces
├── .env.local.example            # Environment variables template
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- A Google Cloud project for OAuth

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd smart-bookmark-app
npm install
```

### 3. Supabase Setup

#### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details and create

#### 3.2 Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste and run this SQL:

```sql
-- Create bookmarks table
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table bookmarks enable row level security;

-- Users can only see their own bookmarks
create policy "Users can view own bookmarks"
  on bookmarks for select
  using (auth.uid() = user_id);

-- Users can insert their own bookmarks
create policy "Users can insert own bookmarks"
  on bookmarks for insert
  with check (auth.uid() = user_id);

-- Users can delete their own bookmarks
create policy "Users can delete own bookmarks"
  on bookmarks for delete
  using (auth.uid() = user_id);

-- Create index for performance
create index bookmarks_user_id_idx on bookmarks(user_id);

-- Enable realtime
alter publication supabase_realtime add table bookmarks;
```

#### 3.3 Configure Google OAuth

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** and enable it
3. Note the callback URL (it will be something like `https://xxxxx.supabase.co/auth/v1/callback`)

#### 3.4 Set Up Google Cloud OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure OAuth consent screen if prompted
6. Choose **Web application**
7. Add authorized redirect URIs:
   - `https://xxxxx.supabase.co/auth/v1/callback` (your Supabase callback URL)
   - `http://localhost:54321/auth/v1/callback` (for local development)
8. Copy the **Client ID** and **Client Secret**
9. Go back to Supabase > Authentication > Providers > Google
10. Paste your Client ID and Client Secret
11. Save

### 4. Environment Variables

1. Copy the example env file:
```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials (found in Supabase dashboard > Settings > API):
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Deploy to Vercel

#### 6.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

#### 6.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

#### 6.3 Update Google OAuth Redirect URIs

1. After deployment, copy your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Go to Google Cloud Console > Credentials
3. Edit your OAuth client
4. Add authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`
5. Save

## Problems Encountered and Solutions

### Problem 1: OAuth Callback Issues

**Issue**: After Google sign-in, redirect wasn't working properly.

**Solution**: 
- Created `/app/auth/callback/route.ts` to handle OAuth code exchange
- Used `createClient()` instead of `createServerSupabaseClient()` in the callback route
- Ensured the redirect URI in Google Cloud Console matched Supabase's callback URL exactly

### Problem 2: Real-time Updates Not Working

**Issue**: Changes in one tab weren't appearing in another tab.

**Solution**:
- Added `alter publication supabase_realtime add table bookmarks;` to SQL
- Implemented proper real-time subscription with user ID filter:
```typescript
const channel = supabase
  .channel('bookmarks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookmarks',
    filter: `user_id=eq.${user.id}`
  }, ...)
```
- Ensured proper cleanup with `supabase.removeChannel(channel)` in useEffect

### Problem 3: Users Could See Other Users' Bookmarks

**Issue**: Row Level Security wasn't properly configured initially.

**Solution**:
- Enabled RLS on the bookmarks table
- Created proper policies using `auth.uid()` to filter by user
- Added cascade delete so bookmarks are removed when user is deleted

### Problem 4: Middleware Conflicts with App Router

**Issue**: Initial implementation tried to use middleware for auth, causing routing issues.

**Solution**:
- Removed middleware approach
- Used client-side auth checking with `useEffect` and `onAuthStateChange`
- Server-side client is available but not needed for this simple use case

### Problem 5: Type Safety Issues

**Issue**: TypeScript errors with Supabase types.

**Solution**:
- Created custom TypeScript interfaces in `lib/types.ts`
- Used proper typing for Supabase responses
- Added type assertions where necessary

### Problem 6: Google Avatar Images Not Loading

**Issue**: Next.js blocking external images by default.

**Solution**:
- Added `lh3.googleusercontent.com` to `next.config.js` image domains
```javascript
images: {
  domains: ['lh3.googleusercontent.com'],
}
```

## Features Breakdown

### Authentication
- Google OAuth via Supabase Auth
- No email/password required
- Automatic session management
- Profile picture from Google account

### Bookmarks Management
- Add bookmarks with URL and title
- Display bookmarks in reverse chronological order
- Delete bookmarks with confirmation UI
- Open bookmarks in new tab

### Real-time Sync
- Changes appear instantly across all open tabs
- Powered by Supabase Realtime
- No polling or page refresh needed

### Security
- Row Level Security ensures data privacy
- Each user can only access their own bookmarks
- Secure OAuth flow
- Environment variables for sensitive data

## Testing the App

1. Open the deployed URL
2. Click "Sign in with Google"
3. Authorize the app
4. Add a bookmark with URL and title
5. Open the same URL in another tab/browser
6. Add/delete bookmarks and watch them sync in real-time
7. Sign out and verify you can't see bookmarks

## Future Enhancements

- [ ] Search and filter bookmarks
- [ ] Tags/categories
- [ ] Bookmark folders
- [ ] Import/export bookmarks
- [ ] Browser extension
- [ ] Bookmark preview/thumbnails
- [ ] Sharing bookmarks with others

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
