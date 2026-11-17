# Turning on online play (Supabase)

Takes about 10 minutes. You only do this once.

## 1. Create the project
1. Go to https://supabase.com, sign up (free) and click **New project**.
2. Pick any name (e.g. `final-whistle`), set a database password (save it somewhere), choose the region closest to you, and create it. Wait about a minute for it to start.

## 2. Create the database tables
1. In the project, open **SQL Editor** → **New query**.
2. Open `src/backend/schema.sql` from this folder, copy all of it, paste it in, and click **Run**. It should say "Success". (Running it again later is safe.) **When the game gets new online features (like Seasons and rematches), run the whole file again** so the database has the new tables.

## 3. Turn on sign-in
**Email + password**
- **Authentication → Sign In / Providers → Email**: make sure it's enabled.
- While testing with friends, you can turn **Confirm email** off so new accounts work immediately. Turn it back on before publishing.

**Google**
1. In Google Cloud Console (https://console.cloud.google.com) create a project, then **APIs & Services → Credentials → Create credentials → OAuth client ID** (type: Web application).
2. Under **Authorized redirect URIs** add the callback URL Supabase shows you in **Authentication → Sign In / Providers → Google** (it looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
3. Copy the Google **Client ID** and **Client secret** into that Supabase Google provider page and enable it.

**Microsoft** (Outlook, Hotmail, Xbox and work accounts)
1. In https://portal.azure.com open **Microsoft Entra ID → App registrations → New registration**. Under supported account types pick "personal Microsoft accounts and any organisation".
2. Add the redirect URI Supabase shows in **Authentication → Sign In / Providers → Azure** (Supabase calls Microsoft "Azure").
3. Under **Certificates & secrets** create a client secret. Copy the Application (client) ID and the secret value into Supabase's Azure provider page and enable it.

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
1. Run `src/backend/schema.sql` again (it adds the `events` and `daily_results` tables).
2. Sign in to the game with your own account, then in **SQL Editor** run (with your username):
   ```sql
   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
   ```
3. Turn on **Two-step login** on your profile page. The owner stats only open in a session that passed the 6-digit code.
4. In the game, open your profile (click your name at the top), then **Game insights**.

Insights shows: players and new players per day, how many came back the next day and a week later, average visit length, how many started vs finished each mode, and the screen people were on when they left without finishing.

## Security settings (in the Supabase dashboard)
The code and `schema.sql` handle most of it. These few switches only exist in the dashboard:

- **Authentication → Sign In / Providers → Email**
  - **Minimum password length**: 12.
  - **Password requirements**: "Lowercase, uppercase letters, digits and symbols". The app already asks for this, but this is the check a script calling the server directly can't skip.
  - **Confirm email**: on before publishing. With it off, signing up with an email that already has an account reveals that it does.
- **Authentication → Rate Limits**: lower "Sign-ups and sign-ins" to about 10 per 5 minutes per IP, and "Token verifications" (the 6-digit codes) to about 10. The app also makes people wait after 5 wrong tries, but only the server limit stops a script.
- **Authentication → Multi-Factor**: make sure **TOTP (App Authenticator)** is enabled. This is what Two-step login uses.
- **Authentication → Attack Protection**: optional CAPTCHA (Cloudflare Turnstile is free) if bots ever start creating accounts.
- Turn on two-step login for **your own** Supabase and GitHub accounts too: whoever gets into those gets everything.

Someone lost their phone and can't do two-step login? In **SQL Editor**, with their username:
```sql
delete from auth.mfa_factors where user_id = (select id from public.profiles where username = 'THEIR_USERNAME');
```
Only do this once you're sure it's really them.

## Looking at everyone's data (owner only)
The app never shows one player another player's private data. You see it in the Supabase dashboard, which works with full rights and ignores the security rules:

- **Table Editor**: every table, row by row (`profiles`, `friendships`, `games`, `results`, `daily_results`, `events`, …).
- **Authentication → Users**: emails, sign-up dates, last sign-in, and who has two-step login on.
- **SQL Editor**: any question, for example
  ```sql
  select p.username, u.email, u.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id order by u.created_at desc;
  ```
- **In the game**: **Profile → Game insights** shows everyone's usage numbers (see above).

Keep the dashboard to yourself: never share the service_role key or the database password.
