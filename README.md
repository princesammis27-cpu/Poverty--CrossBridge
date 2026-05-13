# 🌉 Poverty-CrossBridge AI Platform
### *Bridging Skills to Opportunities and Economic Growth*

> **TVET Fair 2026** — Empowering Youth. Transforming Lives. Building Nations.

---

## 📋 Project Overview

Poverty-CrossBridge AI is a smart youth empowerment platform that connects users with career guidance, skill assessments, learning roadmaps, job opportunities, and a real-time community chat — all powered by Supabase.

**Tech Stack:** HTML5 · CSS3 · Vanilla JavaScript · Supabase (Auth + Database + Storage + Realtime)

---

## 🚀 Quick Setup (5 Steps)

### Step 1 — Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**, name it `poverty-crossbridge-ai`
3. Choose a strong database password and your nearest region
4. Wait for the project to finish provisioning (~1 minute)

---

### Step 2 — Get Your Credentials
1. In your Supabase dashboard, go to **Settings → API**
2. Copy your **Project URL** (looks like `https://xyzabc.supabase.co`)
3. Copy your **anon / public key**
4. Open `supabase-config.js` and replace:
   ```js
   const SUPABASE_URL     = 'https://YOUR_PROJECT_REF.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
   ```

---

### Step 3 — Run the Database Schema
1. In Supabase dashboard, click **SQL Editor → New query**
2. Paste and run the entire SQL block below:

```sql
-- ══════════════════════════════════════════════════════════
-- POVERTY-CROSSBRIDGE AI — Database Schema
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES TABLE ──────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  email       TEXT        UNIQUE,
  role        TEXT        DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES TABLE ──────────────────────────────────────
CREATE TABLE public.messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content      TEXT,
  image_url    TEXT,
  image_path   TEXT,
  message_type TEXT        DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'mixed')),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages  ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read; users manage their own
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Messages: authenticated users read all; insert own; delete own or as admin
CREATE POLICY "messages_select_auth"
  ON public.messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_delete_own_or_admin"
  ON public.messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin full access to profiles
CREATE POLICY "admin_profiles_full"
  ON public.profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── REALTIME ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── STORAGE ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "chat_images_select_all"
  ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "chat_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "chat_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
```

---

### Step 4 — Enable Google OAuth (Optional but Recommended)
1. In Supabase: **Authentication → Providers → Google → Enable**
2. Go to [Google Cloud Console](https://console.cloud.google.com)
3. Create OAuth 2.0 credentials (Web application type)
4. Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client Secret** into Supabase Google provider settings
6. In Supabase: **Authentication → URL Configuration**
   - Site URL: `http://localhost` (or your deployed URL)
   - Redirect URLs: add `http://localhost/dashboard.html` and your deployed URL

---

### Step 5 — Create Your First Admin User
1. Open `index.html` in a browser and sign up with your email
2. After verifying your email, go back to Supabase SQL Editor and run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'YOUR_EMAIL_HERE';
   ```
3. Sign in — you will be automatically redirected to the Admin Panel

---

## 🗂️ File Structure

```
poverty-crossbridge-ai/
├── index.html          ← Login / Sign Up page (animated bridge background)
├── dashboard.html      ← User dashboard (skills, roadmap, opportunities)
├── chat.html           ← Real-time community chat room
├── admin.html          ← Admin monitoring panel
├── supabase-config.js  ← Supabase client + all shared helpers
└── README.md           ← This file
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth | Email/password sign up & sign in with Supabase Auth |
| 🔑 Google OAuth | One-click Google sign in |
| 🔒 Password Security | Bcrypt hashing handled server-side by Supabase (never stored plain) |
| 👁️ Show/Hide Password | Toggle visibility on all password fields |
| ✅ Confirm Password | Required on signup with real-time match validation |
| 💪 Password Strength | Live strength meter (Weak → Fair → Good → Strong) |
| 🏠 Dashboard | Skill assessment quiz, career roadmap, opportunities hub |
| 💬 Community Chat | Real-time messaging with Supabase Realtime |
| 🖼️ Image Upload | Send images up to 5 MB (JPG, PNG, GIF, WEBP) |
| 🗑️ Delete Messages | Users delete own; admins delete any |
| 🚫 No Duplicates | Anti-duplicate guard on send button |
| 👥 Members List | See all platform members in the chat sidebar |
| 🛡️ Admin Panel | Monitor users & messages, promote/remove users |
| 📱 Responsive | Works on mobile, tablet, and desktop |

---

## 🌐 Deploy to GitHub Pages

```bash
# 1. Create a GitHub repository
git init
git add .
git commit -m "Initial commit — Poverty-CrossBridge AI"
git remote add origin https://github.com/YOUR_USERNAME/poverty-crossbridge-ai.git
git push -u origin main

# 2. Enable GitHub Pages
# Go to: Settings → Pages → Source: Deploy from branch → main
# Your site will be live at: https://YOUR_USERNAME.github.io/poverty-crossbridge-ai/
```

**Important:** After deploying, update Supabase Redirect URLs to include your GitHub Pages URL.

---

## 🔧 Troubleshooting

| Issue | Fix |
|---|---|
| "Invalid API key" | Double-check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `supabase-config.js` |
| Google sign-in fails | Verify redirect URIs in both Google Console and Supabase |
| Messages not loading | Confirm Realtime is enabled and RLS policies are applied |
| Images not uploading | Check the `chat-images` storage bucket exists and is public |
| Can't access admin panel | Run the `UPDATE profiles SET role='admin'` SQL for your email |
| Email not received | Check spam folder; enable email confirmations in Supabase Auth settings |

---

## 📄 License

MIT License — Free to use, modify and distribute.

---

*Made with ❤️ for TVET Fair 2026 · #SkillsToOpportunities · Empowering Youth Across Africa*
