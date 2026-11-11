# Turning on online play (Supabase)

Takes about 10 minutes. You only do this once.

## 1. Create the project
1. Go to https://supabase.com, sign up (free) and click **New project**.
2. Pick any name (e.g. `final-whistle`), set a database password (save it somewhere), choose the region closest to you, and create it. Wait about a minute for it to start.

## 2. Create the database tables
1. In the project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this folder, copy all of it, paste it in, and click **Run**. It should say "Success". (Running it again later is safe.) **When the game gets new online features (like Seasons and rematches), run the whole file again** so the database has the new tables.

## 3. Turn on sign-in
**Email + password**
- **Authentication → Sign In / Providers → Email**: make sure it's enabled.
- While testing with friends, you can turn **Confirm email** off so new accounts work immediately. Turn it back on before publishing.

**Google**
1. In Google Cloud Console (https://console.cloud.google.com) create a project, then **APIs & Services → Credentials → Create credentials → OAuth client ID** (type: Web application).
2. Under **Authorized redirect URIs** add the callback URL Supabase shows you in **Authentication → Sign In / Providers → Google** (it looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
3. Copy the Google **Client ID** and **Client secret** into that Supabase Google provider page and enable it.

**Redirect URLs**
- **Authentication → URL Configuration**: set **Site URL** to `http://localhost:5173`, and add `http://localhost:5173` under **Redirect URLs**. (When you publish, add the real website address too.)

## 4. Connect the app
1. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
2. In this folder, copy `.env.example` to a new file called `.env.local` and paste the two values in.
3. Restart the dev server (`npm run dev`).

The anon key is meant to be public: the database's security rules (in `schema.sql`) decide what each signed-in player can read and change. Never put the **service_role** key in the app.

## Testing with friends before publishing
Online play needs everyone to reach the same website. Until it's published, test with two browser windows on your own computer (one normal, one private/incognito, signed in as two different accounts).

## Seeing who plays (Insights)
The game records anonymous usage (a random id per browser: which screens are opened, which modes are finished, how long visits last). Players can switch it off in **Settings → Privacy**.

To see everyone's numbers in the app:
1. Run `supabase/schema.sql` again (it adds the `events` and `daily_results` tables).
2. Sign in to the game with your own account, then in **SQL Editor** run (with your username):
   ```sql
   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
   ```
3. In the game, open your profile (click your name at the top), then **Game insights**.

Insights shows: players and new players per day, how many came back the next day and a week later, average visit length, how many started vs finished each mode, and the screen people were on when they left without finishing.
