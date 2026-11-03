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
  game_id uuid primary key references public.games on delete cascade,
  mode text not null,
  winner uuid references public.profiles on delete set null,
  players uuid[] not null,
  created_at timestamptz not null default now()
);
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

-- Live notifications for friend requests and invites.
do $$ begin
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.game_invites; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end;
end $$;
