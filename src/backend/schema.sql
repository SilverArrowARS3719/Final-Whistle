-- The Final Whistle: accounts, friends, online games, results.
-- Paste this whole file into Supabase > SQL Editor > New query > Run. Safe to run again.

create extension if not exists citext;

-- ---------- who is asking ----------
-- Every rule and function below asks public.me() instead of auth.uid(). It is the signed-in player, except when
-- they have two-step login on and have only typed the password so far: then it is null and they can see or change
-- nothing until the 6-digit code is in. (A stolen password alone gets no data, even straight from the API.)
create or replace function public.me() returns uuid
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then null
    when coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then auth.uid()
    when exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified') then null
    else auth.uid()
  end
$$;

-- ---------- profiles: one per account, username unique (case-insensitive) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext unique not null check (username ~ '^[A-Za-z0-9_]{3,18}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (public.me() is not null);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = public.me());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = public.me());

-- ---------- friendships: one row per pair ----------
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles on delete cascade,
  addressee uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships for select to authenticated using (public.me() in (requester, addressee));
drop policy if exists "send request" on public.friendships;
create policy "send request" on public.friendships for insert to authenticated with check (requester = public.me() and status = 'pending'
  and (select count(*) from public.friendships f where f.requester = public.me() and f.created_at > now() - interval '1 hour') < 40); -- no request spam
drop policy if exists "accept request" on public.friendships;
create policy "accept request" on public.friendships for update to authenticated using (addressee = public.me()) with check (status = 'accepted');
drop policy if exists "remove friendship" on public.friendships;
create policy "remove friendship" on public.friendships for delete to authenticated using (public.me() in (requester, addressee));

-- ---------- games: lobby + shared state ----------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host uuid not null references public.profiles on delete cascade,
  mode text not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  players jsonb not null default '[]', -- [{ "id": uuid, "username": text }] in seat order
  state jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.games enable row level security;
drop policy if exists "players see game" on public.games;
create policy "players see game" on public.games for select to authenticated
  using (players @> jsonb_build_array(jsonb_build_object('id', public.me())));
-- no direct writes: games are created, joined, left and changed only through the functions below
drop policy if exists "host creates game" on public.games;
drop policy if exists "host updates game" on public.games;

-- Create a game with a fresh 6-letter code; the host takes seat 1.
create or replace function public.create_game(p_mode text) returns public.games
language plpgsql security definer set search_path = public as $$
declare g public.games; c text; me public.profiles;
begin
  select * into me from profiles where id = public.me();
  if me is null then raise exception 'Pick a username first'; end if;
  if (select count(*) from games where host = me.id and updated_at > now() - interval '1 hour') >= 30 then
    raise exception 'You are starting games too fast. Wait a few minutes.';
  end if;
  loop
    c := ''; -- 6 characters, no lookalikes (0/O, 1/I)
    for i in 1..6 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from games where code = c);
  end loop;
  insert into games (code, host, mode, players) values (c, me.id, p_mode, jsonb_build_array(jsonb_build_object('id', me.id, 'username', me.username)))
  returning * into g;
  return g;
end $$;

-- Join by code (lobby only, max 8 players). Joining twice is harmless.
create or replace function public.join_game(p_code text) returns public.games
language plpgsql security definer set search_path = public as $$
declare g public.games; me public.profiles;
begin
  select * into me from profiles where id = public.me();
  if me is null then raise exception 'Pick a username first'; end if;
  select * into g from games where code = upper(trim(p_code)) for update;
  if g is null then raise exception 'No game with that code'; end if;
  if g.players @> jsonb_build_array(jsonb_build_object('id', me.id)) then return g; end if;
  if g.status <> 'lobby' then raise exception 'That game has already started'; end if;
  if jsonb_array_length(g.players) >= 8 then raise exception 'That game is full (8 players)'; end if;
  update games set players = players || jsonb_build_array(jsonb_build_object('id', me.id, 'username', me.username)), updated_at = now()
  where id = g.id returning * into g;
  return g;
end $$;

-- Leave a lobby (host leaving cancels it).
create or replace function public.leave_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from games where id = p_game and host = public.me() and status = 'lobby';
  update games set players = (select coalesce(jsonb_agg(p), '[]') from jsonb_array_elements(players) p where p->>'id' <> public.me()::text)
  where id = p_game and status = 'lobby';
end $$;

-- Apply a batch of path edits to the shared state. Any player in the game may write.
-- ops: [{ "path": ["teams", "0", "picks", "3"], "value": {...} }, ...]
create or replace function public.patch_game(p_game uuid, p_ops jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare s jsonb; op jsonb; path text[];
begin
  select state into s from games where id = p_game and players @> jsonb_build_array(jsonb_build_object('id', public.me())) for update;
  if s is null then raise exception 'Not a player in this game'; end if;
  if jsonb_typeof(p_ops) is distinct from 'array' then raise exception 'That move could not be saved'; end if;
  if jsonb_array_length(p_ops) > 400 then raise exception 'Too many changes at once'; end if;
  for op in select * from jsonb_array_elements(p_ops) loop
    -- untrusted input: a path is 1 to 32 short text keys, nothing else
    if jsonb_typeof(op -> 'path') is distinct from 'array' or jsonb_array_length(op -> 'path') not between 1 and 32
       or exists (select 1 from jsonb_array_elements(op -> 'path') k where jsonb_typeof(k) <> 'string' or length(k #>> '{}') > 200)
    then raise exception 'That move could not be saved'; end if;
    path := array(select jsonb_array_elements_text(op->'path'));
    s := jsonb_set(s, path, op->'value', true);
  end loop;
  if pg_column_size(s) > 1500000 then raise exception 'Game state is too large'; end if;
  update games set state = s, status = case when status = 'lobby' then 'playing' else status end, updated_at = now() where id = p_game;
end $$;

-- ---------- invites ----------
create table if not exists public.game_invites (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games on delete cascade,
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, to_user)
);
alter table public.game_invites add column if not exists mode text; -- which game mode the invite is for
alter table public.game_invites enable row level security;
drop policy if exists "see own invites" on public.game_invites;
create policy "see own invites" on public.game_invites for select to authenticated using (public.me() in (from_user, to_user));
-- (the "invite friends" rule is further down, after the league tables it refers to)
drop policy if exists "dismiss invite" on public.game_invites;
create policy "dismiss invite" on public.game_invites for delete to authenticated using (public.me() in (from_user, to_user));

-- Invited players need to see the game's code to join.
create or replace function public.invite_code(p_invite bigint) returns text
language sql security definer set search_path = public as $$
  select g.code from game_invites i join games g on g.id = i.game_id where i.id = p_invite and i.to_user = public.me();
$$;

-- ---------- results (feeds the friends leaderboard) ----------
create table if not exists public.results (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games on delete cascade, -- one game can hold several rematches
  mode text not null,
  winner uuid references public.profiles on delete set null,
  players uuid[] not null,
  created_at timestamptz not null default now()
);
-- upgrade from the first version, where game_id was the primary key (one result per game, so no rematches)
alter table public.results add column if not exists id bigint generated always as identity;
do $$ begin
  if exists (select 1 from information_schema.key_column_usage where table_schema = 'public' and table_name = 'results'
             and constraint_name = 'results_pkey' and column_name = 'game_id') then
    alter table public.results drop constraint results_pkey;
    alter table public.results add primary key (id);
  end if;
end $$;
create index if not exists results_players on public.results using gin (players);
alter table public.results enable row level security;
drop policy if exists "results readable" on public.results;
create policy "results readable" on public.results for select to authenticated using (public.me() = any(players)); -- only games you played in
drop policy if exists "host records result" on public.results;
-- Only the host, only for people who were really in that game, and not more often than a game can be played.
create policy "host records result" on public.results for insert to authenticated
  with check (
    exists (
      select 1 from games g where g.id = results.game_id and g.host = public.me()
        and (results.winner is null or g.players @> jsonb_build_array(jsonb_build_object('id', results.winner)))
        and cardinality(results.players) between 2 and 8
        and not exists (select 1 from unnest(results.players) p where not g.players @> jsonb_build_array(jsonb_build_object('id', p))))
    and not exists (select 1 from results r where r.game_id = results.game_id and r.created_at > now() - interval '90 seconds'));

-- Wins and games played for me and my accepted friends.
create or replace function public.friends_leaderboard() returns table (id uuid, username citext, wins bigint, played bigint)
language sql security definer set search_path = public as $$
  with circle as (
    select public.me() as id
    union select case when requester = public.me() then addressee else requester end
    from friendships where status = 'accepted' and public.me() in (requester, addressee)
  )
  select p.id, p.username,
    (select count(*) from results r where r.winner = p.id) as wins,
    (select count(*) from results r where p.id = any(r.players)) as played
  from circle c join profiles p on p.id = c.id
  order by wins desc, played asc, p.username;
$$;

-- ---------- leagues: a permanent group of mates, played in one-year seasons ----------
-- (The tables are still called seasons / season_members from the first version; a row is a league.)
-- Season 1 runs for a year from the day the league was created, then season 2 starts, and so on.
-- Every online game finished in that year counts if at least two members played in it. Most wins takes the season.
-- Every online game finished during the season counts if at least two members played in it.
-- Champion 3 points, everyone else who played 1. Ties broken by wins, then fewer games.
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null check (length(name) between 1 and 40),
  owner uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);
create table if not exists public.season_members (
  season_id uuid not null references public.seasons on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
-- no direct table access: everything goes through the functions below, which check membership
alter table public.seasons enable row level security;
alter table public.season_members enable row level security;

-- p_weeks is ignored: leagues never end, they just roll into the next season (kept so old app versions still work)
create or replace function public.create_season(p_name text, p_weeks int default null) returns public.seasons
language plpgsql security definer set search_path = public as $$
declare s public.seasons; c text;
begin
  if not exists (select 1 from profiles where id = public.me()) then raise exception 'Pick a username first'; end if;
  if (select count(*) from seasons where owner = public.me() and starts_at > now() - interval '1 day') >= 10 then
    raise exception 'You have started a lot of leagues today. Try again tomorrow.';
  end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from seasons where code = c);
  end loop;
  insert into seasons (code, name, owner, ends_at) values (c, trim(p_name), public.me(), 'infinity') returning * into s;
  insert into season_members (season_id, user_id) values (s.id, public.me());
  return s;
end $$;

create or replace function public.join_season(p_code text) returns public.seasons
language plpgsql security definer set search_path = public as $$
declare s public.seasons;
begin
  if not exists (select 1 from profiles where id = public.me()) then raise exception 'Pick a username first'; end if;
  select * into s from seasons where code = upper(trim(p_code));
  if s is null then raise exception 'No league with that code'; end if;
  if s.ends_at < now() then raise exception 'That league has closed'; end if;
  if (select count(*) from season_members where season_id = s.id) >= 30 then raise exception 'That league is full (30 players)'; end if;
  insert into season_members (season_id, user_id) values (s.id, public.me()) on conflict do nothing;
  return s;
end $$;

-- Any member may add one of their own friends.
create or replace function public.add_to_season(p_season uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from season_members where season_id = p_season and user_id = public.me()) then raise exception 'Not in this season'; end if;
  if not exists (select 1 from friendships where status = 'accepted'
                 and least(requester, addressee) = least(public.me(), p_user) and greatest(requester, addressee) = greatest(public.me(), p_user))
  then raise exception 'You can only add friends'; end if;
  insert into season_members (season_id, user_id) values (p_season, p_user) on conflict do nothing;
end $$;

create or replace function public.leave_season(p_season uuid) returns void
language sql security definer set search_path = public as $$
  delete from season_members where season_id = p_season and user_id = public.me();
$$;

create or replace function public.my_seasons() returns table (id uuid, code text, name text, owner uuid, starts_at timestamptz, ends_at timestamptz, members bigint)
language sql security definer set search_path = public as $$
  select s.id, s.code, s.name, s.owner, s.starts_at, s.ends_at, (select count(*) from season_members x where x.season_id = s.id)
  from seasons s join season_members m on m.season_id = s.id and m.user_id = public.me()
  order by s.starts_at desc;
$$;

-- The league table. form = last five results, newest first ('W' or 'L'); streak = current run of wins.
-- One season's table. p_index: 1 for the first year, 2 for the second…; null means the season running now.
drop function if exists public.season_table(uuid);
create or replace function public.season_table(p_season uuid, p_index int default null)
returns table (user_id uuid, username citext, played int, wins int, points int, streak int, best_streak int, form text, week_points int)
language plpgsql security definer set search_path = public as $$
declare s public.seasons; m record; idx int; w_start timestamptz; w_end timestamptz; outcomes boolean[]; stamps timestamptz[]; run int; best int; cur int;
begin
  select * into s from seasons where id = p_season;
  if s is null or not exists (select 1 from season_members where season_id = p_season and season_members.user_id = public.me()) then
    raise exception 'Not in this league';
  end if;
  idx := coalesce(p_index, greatest(1, floor(extract(epoch from now() - s.starts_at) / (365.25 * 86400))::int + 1));
  w_start := s.starts_at + make_interval(years => idx - 1);
  w_end := s.starts_at + make_interval(years => idx);
  for m in select sm.user_id as uid, p.username as uname from season_members sm join profiles p on p.id = sm.user_id where sm.season_id = p_season loop
    select coalesce(array_agg(r.winner = m.uid order by r.created_at desc), '{}'), coalesce(array_agg(r.created_at order by r.created_at desc), '{}')
      into outcomes, stamps
    from results r
    where m.uid = any(r.players) and r.created_at >= w_start and r.created_at < w_end
      and (select count(*) from season_members x where x.season_id = p_season and x.user_id = any(r.players)) >= 2;
    run := 0; best := 0; cur := null;
    for i in 1..coalesce(array_length(outcomes, 1), 0) loop
      if outcomes[i] then run := run + 1; best := greatest(best, run);
      else if cur is null then cur := run; end if; run := 0; end if;
    end loop;
    user_id := m.uid; username := m.uname;
    played := coalesce(array_length(outcomes, 1), 0);
    wins := (select count(*) from unnest(outcomes) o where o);
    points := wins * 3 + (played - wins);
    streak := coalesce(cur, run);
    best_streak := best;
    form := (select coalesce(string_agg(case when o then 'W' else 'L' end, '' order by n), '') from unnest(outcomes[1:5]) with ordinality as t(o, n));
    week_points := (select coalesce(sum(case when o then 3 else 1 end), 0) from unnest(outcomes, stamps) as t(o, ts) where ts > now() - interval '7 days');
    return next;
  end loop;
end $$;

-- Past champions: for every finished season, whoever won the most games (ties: more points, then fewer games).
create or replace function public.league_honours(p_season uuid)
returns table (season int, username citext, wins int, played int)
language plpgsql security definer set search_path = public as $$
declare s public.seasons; n int; best record;
begin
  select * into s from seasons where id = p_season;
  if s is null or not exists (select 1 from season_members where season_id = p_season and season_members.user_id = public.me()) then
    raise exception 'Not in this league';
  end if;
  n := floor(extract(epoch from now() - s.starts_at) / (365.25 * 86400))::int; -- finished seasons so far
  for i in 1..n loop
    select t.username, t.wins, t.played into best from season_table(p_season, i) t
      where t.played > 0 order by t.wins desc, t.points desc, t.played asc limit 1;
    if found then season := i; username := best.username; wins := best.wins; played := best.played; return next; end if;
  end loop;
end $$;

-- Who may invite whom to a game: friends, or players in the same league.
drop policy if exists "invite friends" on public.game_invites;
create policy "invite friends" on public.game_invites for insert to authenticated with check (
  from_user = public.me()
  and (select count(*) from public.game_invites i where i.from_user = public.me() and i.created_at > now() - interval '1 hour') < 60 -- no invite spam
  and exists (select 1 from games g where g.id = game_invites.game_id and g.players @> jsonb_build_array(jsonb_build_object('id', public.me())))
  and (
    exists (
      select 1 from friendships f where f.status = 'accepted'
        and least(f.requester, f.addressee) = least(from_user, to_user) and greatest(f.requester, f.addressee) = greatest(from_user, to_user))
    -- league-mates can invite each other without being friends
    or exists (select 1 from season_members a join season_members b on a.season_id = b.season_id where a.user_id = from_user and b.user_id = to_user)));

-- ---------- Daily Draft: one result per account per day ----------
create table if not exists public.daily_results (
  user_id uuid not null references public.profiles on delete cascade default public.me(),
  day date not null,
  points int not null check (points between 0 and 9),
  gf int not null check (gf between 0 and 60),
  ga int not null check (ga between 0 and 60),
  rating numeric(4, 1) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_results enable row level security;
drop policy if exists "post own daily" on public.daily_results;
create policy "post own daily" on public.daily_results for insert to authenticated
  with check (user_id = public.me() and day between current_date - 1 and current_date + 1); -- a day either side covers every time zone

-- Everyone's score for one day: points, then goal difference, then XI rating. Flags friends and me.
create or replace function public.daily_board(p_day date)
returns table (username citext, points int, gd int, rating numeric, friend boolean, me boolean)
language sql security definer set search_path = public as $$
  select p.username, d.points, d.gf - d.ga, d.rating,
    exists (select 1 from friendships f where f.status = 'accepted'
      and ((f.requester = public.me() and f.addressee = d.user_id) or (f.addressee = public.me() and f.requester = d.user_id))),
    d.user_id = public.me()
  from daily_results d join profiles p on p.id = d.user_id
  where d.day = p_day
  order by d.points desc, d.gf - d.ga desc, d.rating desc, d.created_at
  limit 100;
$$;

-- ---------- usage events (anonymous: a random id per browser, no names or emails) ----------
alter table public.profiles add column if not exists is_admin boolean not null default false;
create table if not exists public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  device text not null check (length(device) <= 64),
  session text not null check (length(session) <= 64),
  user_id uuid,
  name text not null check (length(name) <= 40),
  props jsonb check (props is null or length(props::text) <= 2000)
);
create index if not exists events_at on public.events (at);
alter table public.events enable row level security;
-- anyone may add events (signed in or not); nobody can read them directly
drop policy if exists "add events" on public.events;
create policy "add events" on public.events for insert to anon, authenticated
  with check ((user_id is null or user_id = public.me()) and events.at between now() - interval '2 days' and now() + interval '10 minutes');

-- The owner reads everything through this. Make yourself the owner once, in the SQL editor:
--   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
create or replace function public.admin_events(p_days int default 30)
returns setof public.events
language plpgsql security definer set search_path = public as $$
begin
  -- the owner flag alone is not enough: the owner must also have passed two-step login this session
  if not exists (select 1 from profiles where id = public.me() and is_admin) or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'not allowed';
  end if;
  return query select * from events where at > now() - make_interval(days => least(p_days, 90)) order by at limit 100000;
end $$;

-- ---------- feedback ----------
-- Players write it through send_feedback() only; nobody can read it from the app. You read it in the Supabase
-- dashboard (Table Editor → feedback).
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 40),
  message text not null check (length(message) between 3 and 2000),
  screen text check (screen is null or screen ~ '^[a-z0-9:_-]{1,40}$'),
  version text check (version is null or version ~ '^[0-9][0-9.]{0,15}$')
);
create index if not exists feedback_at on public.feedback (at);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.send_feedback(p_name text, p_message text, p_screen text default null, p_version text default null) returns void
language plpgsql security definer set search_path = public as $$
declare msg text := trim(coalesce(p_message, '')); who uuid := public.me();
begin
  if length(msg) < 3 then raise exception 'Write a few words first.'; end if;
  -- spam limits: 10 an hour per account; visitors without one share 60 an hour between them
  if (select count(*) from feedback where at > now() - interval '1 hour' and user_id is not distinct from who) >= (case when who is null then 60 else 10 end) then
    raise exception 'Thanks, that is plenty for now. Try again in an hour.';
  end if;
  insert into feedback (user_id, name, message, screen, version)
  values (who, left(coalesce(nullif(trim(p_name), ''), 'Anonymous'), 40), left(msg, 2000),
          case when p_screen ~ '^[a-z0-9:_-]{1,40}$' then p_screen end, case when p_version ~ '^[0-9][0-9.]{0,15}$' then p_version end);
end $$;

-- ---------- delete my data ----------
-- Removes the caller's account and everything linked to it. Profiles, friendships, invites, league
-- memberships and daily results go with the user (on delete cascade); their usage events are deleted here,
-- and finished results keep the game but lose the link to them.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := public.me();
begin
  if me is null then raise exception 'Not signed in'; end if;
  delete from public.events where user_id = me;
  delete from public.feedback where user_id = me;
  update public.results set players = array_remove(players, me) where me = any(players);
  delete from public.games where host = me and status <> 'finished';
  delete from auth.users where id = me;
end $$;

-- Anonymous usage events are tied to a random browser id, not a person; this lets that browser wipe them.
create or replace function public.forget_device(p_device text) returns void
language sql security definer set search_path = public as $$
  delete from events where device = p_device and length(p_device) between 8 and 64;
$$;

-- ---------- locking down what the app may write ----------
-- Row rules above say WHICH rows; these say which COLUMNS. Without them a player could set is_admin on their
-- own profile, or rewrite who a friend request is from while accepting it.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant insert (id, username) on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = public.me()) with check (id = public.me());

revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

revoke insert, update, delete on public.games from anon, authenticated;
revoke update, delete on public.results from anon, authenticated;
revoke update, delete on public.daily_results from anon, authenticated;
revoke select, update, delete on public.events from anon, authenticated;
revoke all on public.seasons, public.season_members from anon, authenticated;
revoke all on public.profiles, public.friendships, public.games, public.game_invites, public.results, public.daily_results from anon;

-- The functions in this file run with the owner's rights, so only signed-in players may call them.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
-- …except this one, which visitors without an account need too (it only ever deletes their own browser's stats)
grant execute on function public.forget_device(text) to anon;
-- …and the identity check every row rule uses (visitors adding usage stats go through it too)
grant execute on function public.me() to anon, authenticated;
-- …and sending feedback, which works without an account too (limits are inside the function)
grant execute on function public.send_feedback(text, text, text, text) to anon;

-- Other players see a username and when the account was made, nothing else (not who the owner is).
revoke select on public.profiles from authenticated;
grant select (id, username, created_at) on public.profiles to authenticated;

-- ---------- what may be stored: the database checks it, whatever the app sends ----------
-- ("not valid" = applies to every new or changed row; rows already saved are left alone)
alter table public.games drop constraint if exists games_mode_ok;
alter table public.games add constraint games_mode_ok check (mode ~ '^[a-z0-9_-]{1,24}$') not valid;
alter table public.results drop constraint if exists results_mode_ok;
alter table public.results add constraint results_mode_ok check (mode ~ '^[a-z0-9_-]{1,24}$') not valid;
alter table public.game_invites drop constraint if exists game_invites_mode_ok;
alter table public.game_invites add constraint game_invites_mode_ok check (mode is null or mode ~ '^[a-z0-9_-]{1,24}$') not valid;
alter table public.daily_results drop constraint if exists daily_results_rating_ok;
alter table public.daily_results add constraint daily_results_rating_ok check (rating between 0 and 100) not valid;
alter table public.seasons drop constraint if exists seasons_name_ok;
alter table public.seasons add constraint seasons_name_ok check (name !~ '[[:cntrl:]<>]') not valid;

-- Live notifications for friend requests and invites.
do $$ begin
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.game_invites; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end;
end $$;
