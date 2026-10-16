-- Kindset database (step 2). Paste into Supabase → SQL Editor → Run.
-- One brand, many city chapters: chapter → season → event → rounds → matches.

create table chapters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- 'alanya'
  city text not null,
  country text not null,                  -- 'TR'
  currency text not null default 'TRY',
  timezone text not null default 'Europe/Istanbul',
  default_lang text not null default 'ru',
  telegram_chat_id bigint,                -- group set with /connect
  created_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,     -- verified from Telegram initData on the server
  name text not null,
  username text,
  level numeric(3,1) default 2.0,         -- 0–7
  langs text[] default '{}',
  created_at timestamptz default now()
);

create table chapter_members (
  chapter_id uuid references chapters on delete cascade,
  player_id uuid references players on delete cascade,
  role text not null default 'player' check (role in ('player','organizer','admin')),
  primary key (chapter_id, player_id)
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters on delete cascade,
  number int not null,
  starts_on date, ends_on date,
  unique (chapter_id, number)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters on delete cascade,
  season_id uuid references seasons on delete set null,
  starts_at timestamptz not null,
  duration_min int default 120,
  venue text,
  price numeric(10,2),
  capacity int default 16,
  courts int default 2,
  target_points int default 21,
  format text default 'mexicano' check (format in ('mexicano','americano')),
  status text default 'open' check (status in ('open','live','finished','cancelled')),
  charity_raised numeric(10,2) default 0,
  reminded_at timestamptz                 -- reminder sent once per night
);

create table registrations (
  event_id uuid references events on delete cascade,
  player_id uuid references players on delete cascade,
  created_at timestamptz default now(),   -- order decides who is in vs waitlist
  paid boolean default false,
  primary key (event_id, player_id)
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events on delete cascade,
  number int not null,
  resting uuid[] default '{}',
  unique (event_id, number)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds on delete cascade,
  court int not null,
  a1 uuid references players, a2 uuid references players,
  b1 uuid references players, b2 uuid references players,
  score_a int, score_b int,
  done boolean default false
);

create table award_votes (
  event_id uuid references events on delete cascade,
  voter_id uuid references players on delete cascade,
  award text not null check (award in ('spirit')),
  nominee_id uuid references players on delete cascade,
  primary key (event_id, voter_id, award)
);

-- Season table = sum of points each player scored in finished events of the season.
create view season_points as
select e.season_id, p.player_id, sum(p.points) as points, count(distinct e.id) as weeks
from events e
join rounds r on r.event_id = e.id
join matches m on m.round_id = r.id and m.done
cross join lateral (values (m.a1, m.score_a), (m.a2, m.score_a), (m.b1, m.score_b), (m.b2, m.score_b)) as p(player_id, points)
group by e.season_id, p.player_id;

-- Row level security: the app reads publicly; all writes go through a server
-- function that verifies Telegram initData with the bot token.
alter table chapters enable row level security;
alter table players enable row level security;
alter table chapter_members enable row level security;
alter table seasons enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table rounds enable row level security;
alter table matches enable row level security;
alter table award_votes enable row level security;
create policy read_all on chapters for select using (true);
create policy read_all on seasons for select using (true);
create policy read_all on events for select using (true);
create policy read_all on registrations for select using (true);
create policy read_all on rounds for select using (true);
create policy read_all on matches for select using (true);
create policy read_all on players for select using (true);

insert into chapters (slug, city, country) values ('alanya', 'Alanya', 'TR');
