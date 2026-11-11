-- The Draft Room: accounts, friends, online games, results.
-- Paste this whole file into Supabase > SQL Editor > New query > Run. Safe to run again.

create extension if not exists citext;

-- ---------- profiles: one per account, username unique (case-insensitive) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext unique not null check (username ~ '^[A-Za-z0-9_]{3,18}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

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
create policy "see own friendships" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "send request" on public.friendships;
create policy "send request" on public.friendships for insert to authenticated with check (requester = auth.uid() and status = 'pending');
drop policy if exists "accept request" on public.friendships;
create policy "accept request" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (status = 'accepted');
drop policy if exists "remove friendship" on public.friendships;
create policy "remove friendship" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

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
  using (players @> jsonb_build_array(jsonb_build_object('id', auth.uid())));
drop policy if exists "host creates game" on public.games;
create policy "host creates game" on public.games for insert to authenticated with check (host = auth.uid());
drop policy if exists "host updates game" on public.games;
create policy "host updates game" on public.games for update to authenticated using (host = auth.uid());

-- Create a game with a fresh 6-letter code; the host takes seat 1.
create or replace function public.create_game(p_mode text) returns public.games
language plpgsql security definer set search_path = public as $$
declare g public.games; c text; me public.profiles;
begin
  select * into me from profiles where id = auth.uid();
  if me is null then raise exception 'Pick a username first'; end if;
  loop
    c := ''; -- 6 characters, no lookalikes (0/O, 1/I)
    for i in 1..6 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from games where code = c);
  end loop;
  insert into games (code, host, mode, players) values (c, me.id, p_mode, jsonb_build_array(jsonb_build_object('id', me.id, 'username', me.username)))
  returning * into g;
  return g;
end $$;

-- Join by code (lobby only, max 4 players). Joining twice is harmless.
create or replace function public.join_game(p_code text) returns public.games
language plpgsql security definer set search_path = public as $$
declare g public.games; me public.profiles;
begin
  select * into me from profiles where id = auth.uid();
  if me is null then raise exception 'Pick a username first'; end if;
  select * into g from games where code = upper(trim(p_code)) for update;
  if g is null then raise exception 'No game with that code'; end if;
  if g.players @> jsonb_build_array(jsonb_build_object('id', me.id)) then return g; end if;
  if g.status <> 'lobby' then raise exception 'That game has already started'; end if;
  if jsonb_array_length(g.players) >= 4 then raise exception 'That game is full (4 players)'; end if;
  update games set players = players || jsonb_build_array(jsonb_build_object('id', me.id, 'username', me.username)), updated_at = now()
  where id = g.id returning * into g;
  return g;
end $$;

-- Leave a lobby (host leaving cancels it).
create or replace function public.leave_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from games where id = p_game and host = auth.uid() and status = 'lobby';
  update games set players = (select coalesce(jsonb_agg(p), '[]') from jsonb_array_elements(players) p where p->>'id' <> auth.uid()::text)
  where id = p_game and status = 'lobby';
end $$;

-- Apply a batch of path edits to the shared state. Any player in the game may write.
-- ops: [{ "path": ["teams", "0", "picks", "3"], "value": {...} }, ...]
create or replace function public.patch_game(p_game uuid, p_ops jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare s jsonb; op jsonb; path text[];
begin
  select state into s from games where id = p_game and players @> jsonb_build_array(jsonb_build_object('id', auth.uid())) for update;
  if s is null then raise exception 'Not a player in this game'; end if;
  for op in select * from jsonb_array_elements(p_ops) loop
    path := array(select jsonb_array_elements_text(op->'path'));
    s := jsonb_set(s, path, op->'value', true);
  end loop;
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
create policy "see own invites" on public.game_invites for select to authenticated using (auth.uid() in (from_user, to_user));
drop policy if exists "invite friends" on public.game_invites;
create policy "invite friends" on public.game_invites for insert to authenticated with check (
  from_user = auth.uid() and exists (
    select 1 from friendships f where f.status = 'accepted'
      and least(f.requester, f.addressee) = least(from_user, to_user) and greatest(f.requester, f.addressee) = greatest(from_user, to_user)));
drop policy if exists "dismiss invite" on public.game_invites;
create policy "dismiss invite" on public.game_invites for delete to authenticated using (auth.uid() in (from_user, to_user));

-- Invited players need to see the game's code to join.
create or replace function public.invite_code(p_invite bigint) returns text
language sql security definer set search_path = public as $$
  select g.code from game_invites i join games g on g.id = i.game_id where i.id = p_invite and i.to_user = auth.uid();
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
create policy "results readable" on public.results for select to authenticated using (true);
drop policy if exists "host records result" on public.results;
create policy "host records result" on public.results for insert to authenticated
  with check (exists (select 1 from games g where g.id = game_id and g.host = auth.uid()));

-- Wins and games played for me and my accepted friends.
create or replace function public.friends_leaderboard() returns table (id uuid, username citext, wins bigint, played bigint)
language sql security definer set search_path = public as $$
  with circle as (
    select auth.uid() as id
    union select case when requester = auth.uid() then addressee else requester end
    from friendships where status = 'accepted' and auth.uid() in (requester, addressee)
  )
  select p.id, p.username,
    (select count(*) from results r where r.winner = p.id) as wins,
    (select count(*) from results r where p.id = any(r.players)) as played
  from circle c join profiles p on p.id = c.id
  order by wins desc, played asc, p.username;
$$;

-- ---------- seasons: a league between friends ----------
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

create or replace function public.create_season(p_name text, p_weeks int) returns public.seasons
language plpgsql security definer set search_path = public as $$
declare s public.seasons; c text;
begin
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Pick a username first'; end if;
  if p_weeks not between 1 and 52 then raise exception 'A season lasts 1 to 52 weeks'; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from seasons where code = c);
  end loop;
  insert into seasons (code, name, owner, ends_at) values (c, trim(p_name), auth.uid(), now() + make_interval(weeks => p_weeks)) returning * into s;
  insert into season_members (season_id, user_id) values (s.id, auth.uid());
  return s;
end $$;

create or replace function public.join_season(p_code text) returns public.seasons
language plpgsql security definer set search_path = public as $$
declare s public.seasons;
begin
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Pick a username first'; end if;
  select * into s from seasons where code = upper(trim(p_code));
  if s is null then raise exception 'No season with that code'; end if;
  if s.ends_at < now() then raise exception 'That season has finished'; end if;
  if (select count(*) from season_members where season_id = s.id) >= 20 then raise exception 'That season is full (20 players)'; end if;
  insert into season_members (season_id, user_id) values (s.id, auth.uid()) on conflict do nothing;
  return s;
end $$;

-- Any member may add one of their own friends.
create or replace function public.add_to_season(p_season uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from season_members where season_id = p_season and user_id = auth.uid()) then raise exception 'Not in this season'; end if;
  if not exists (select 1 from friendships where status = 'accepted'
                 and least(requester, addressee) = least(auth.uid(), p_user) and greatest(requester, addressee) = greatest(auth.uid(), p_user))
  then raise exception 'You can only add friends'; end if;
  insert into season_members (season_id, user_id) values (p_season, p_user) on conflict do nothing;
end $$;

create or replace function public.leave_season(p_season uuid) returns void
language sql security definer set search_path = public as $$
  delete from season_members where season_id = p_season and user_id = auth.uid();
$$;

create or replace function public.my_seasons() returns table (id uuid, code text, name text, owner uuid, starts_at timestamptz, ends_at timestamptz, members bigint)
language sql security definer set search_path = public as $$
  select s.id, s.code, s.name, s.owner, s.starts_at, s.ends_at, (select count(*) from season_members x where x.season_id = s.id)
  from seasons s join season_members m on m.season_id = s.id and m.user_id = auth.uid()
  order by s.ends_at < now(), s.ends_at;
$$;

-- The league table. form = last five results, newest first ('W' or 'L'); streak = current run of wins.
create or replace function public.season_table(p_season uuid)
returns table (user_id uuid, username citext, played int, wins int, points int, streak int, best_streak int, form text, week_points int)
language plpgsql security definer set search_path = public as $$
declare s public.seasons; m record; outcomes boolean[]; stamps timestamptz[]; run int; best int; cur int;
begin
  select * into s from seasons where id = p_season;
  if s is null or not exists (select 1 from season_members where season_id = p_season and season_members.user_id = auth.uid()) then
    raise exception 'Not in this season';
  end if;
  for m in select sm.user_id as uid, p.username as uname from season_members sm join profiles p on p.id = sm.user_id where sm.season_id = p_season loop
    select coalesce(array_agg(r.winner = m.uid order by r.created_at desc), '{}'), coalesce(array_agg(r.created_at order by r.created_at desc), '{}')
      into outcomes, stamps
    from results r
    where m.uid = any(r.players) and r.created_at between s.starts_at and s.ends_at
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

-- ---------- Daily Draft: one result per account per day ----------
create table if not exists public.daily_results (
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
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
create policy "post own daily" on public.daily_results for insert to authenticated with check (user_id = auth.uid());

-- Everyone's score for one day: points, then goal difference, then XI rating. Flags friends and me.
create or replace function public.daily_board(p_day date)
returns table (username citext, points int, gd int, rating numeric, friend boolean, me boolean)
language sql security definer set search_path = public as $$
  select p.username, d.points, d.gf - d.ga, d.rating,
    exists (select 1 from friendships f where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = d.user_id) or (f.addressee = auth.uid() and f.requester = d.user_id))),
    d.user_id = auth.uid()
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
  with check (user_id is null or user_id = auth.uid());

-- The owner reads everything through this. Make yourself the owner once, in the SQL editor:
--   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
create or replace function public.admin_events(p_days int default 30)
returns setof public.events
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'not allowed';
  end if;
  return query select * from events where at > now() - make_interval(days => least(p_days, 90)) order by at limit 100000;
end $$;

-- Live notifications for friend requests and invites.
do $$ begin
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.game_invites; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end;
end $$;
