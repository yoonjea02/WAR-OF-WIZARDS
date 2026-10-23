-- ════════════════════════════════════════════════════════════════════════
-- War of Wizards — Supabase 스키마 (아웃게임 / 메타 시스템, 담당: ㅈㅇㅈ)
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run
-- 무료 티어 기준이며 외부 유료 서비스는 사용하지 않는다.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. profiles ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  rating      int  not null default 1000,
  wins        int  not null default 0,
  losses      int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint nickname_format check (nickname ~ '^[A-Za-z0-9가-힣_]{2,12}$')
);
create unique index if not exists profiles_nickname_key on public.profiles (lower(nickname));
create index if not exists profiles_rating_idx on public.profiles (rating desc, wins desc);

-- 닉네임 중복 확인 (가입 전 anon 도 호출 가능)
create or replace function public.nickname_available(p_nickname text)
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(nickname) = lower(trim(p_nickname)));
$$;
grant execute on function public.nickname_available(text) to anon, authenticated;

-- ── 2. decks (마법서: 19종 중 8장) ─────────────────────────────────────
create table if not exists public.decks (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  skills      text[] not null,
  updated_at  timestamptz not null default now()
);

-- 클라이언트 검증(src/data/skills.ts validateDeck)과 동일한 규칙을 DB에서도 강제
create or replace function public.validate_deck()
returns trigger language plpgsql as $$
declare
  s text;
  high_cnt int;
begin
  if cardinality(new.skills) <> 8 then
    raise exception '덱은 정확히 8장이어야 합니다.';
  end if;
  if (select count(distinct x) from unnest(new.skills) x) <> 8 then
    raise exception '같은 스킬을 중복해서 넣을 수 없습니다.';
  end if;
  foreach s in array new.skills loop
    if s !~ '^(S(0[1-9]|1[0-3])|H0[1-6])$' then
      raise exception '존재하지 않는 스킬이 포함되어 있습니다.';
    end if;
  end loop;
  select count(*) into high_cnt from unnest(new.skills) x where x like 'H%';
  if high_cnt > 2 then
    raise exception '고위력 스킬은 덱에 최대 2장까지 넣을 수 있습니다.';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists decks_validate on public.decks;
create trigger decks_validate before insert or update on public.decks
  for each row execute function public.validate_deck();

-- ── 3. matches (전적) ──────────────────────────────────────────────────
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  mode          text not null check (mode in ('ranked','friendly','bot')),
  result        text not null check (result in ('win','lose')),
  opponent_name text not null,
  duration_sec  int  not null check (duration_sec between 0 and 7200),
  casts         int  not null default 0 check (casts >= 0),
  rating_delta  int  not null default 0,
  ended_at      timestamptz not null default now()
);
create index if not exists matches_user_idx on public.matches (user_id, ended_at desc);

-- 전적 기록 + 프로필 집계를 한 번에 처리. 클라이언트가 profiles 를 직접 수정하지 못하게 함수로만 허용.
-- ⚠ 프로토타입: 호출자가 결과를 신고하는 구조.
--   실서비스에서는 Photon 전용 서버(ㅈㅈㅇ)가 service_role 키로 결과를 기록하도록 바꿀 것.
create or replace function public.record_match(
  p_mode text, p_result text, p_opponent text, p_duration int, p_casts int
) returns public.matches language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_delta int := 0;
  rec public.matches;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_mode not in ('ranked','friendly','bot') or p_result not in ('win','lose') then
    raise exception '잘못된 전적 데이터입니다.';
  end if;
  if p_mode = 'ranked' then
    v_delta := case when p_result = 'win' then 16 else -16 end;
  end if;

  insert into public.matches (user_id, mode, result, opponent_name, duration_sec, casts, rating_delta)
  values (v_uid, p_mode, p_result, left(coalesce(p_opponent, '?'), 30),
          greatest(0, least(p_duration, 7200)), greatest(0, p_casts), v_delta)
  returning * into rec;

  update public.profiles
     set wins   = wins   + (p_result = 'win')::int,
         losses = losses + (p_result = 'lose')::int,
         rating = greatest(0, rating + v_delta)
   where id = v_uid;

  return rec;
end $$;
revoke all on function public.record_match(text, text, text, int, int) from public, anon;
grant execute on function public.record_match(text, text, text, int, int) to authenticated;

-- ── 4. friendships (친구) ──────────────────────────────────────────────
create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  requester   uuid not null references auth.users(id) on delete cascade,
  addressee   uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted')),
  created_at  timestamptz not null default now(),
  constraint no_self_friend check (requester <> addressee)
);
-- (A→B) 와 (B→A) 중복 방지
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

-- ── 5. mails / notices (우편함·공지·초대) ──────────────────────────────
create table if not exists public.mails (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  from_user  uuid references auth.users(id) on delete set null,
  from_nick  text,
  kind       text not null default 'mail' check (kind in ('mail','invite')),
  title      text not null,
  body       text not null default '',
  room_code  text check (room_code is null or room_code ~ '^[A-Z0-9]{6}$'),
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mails_user_idx on public.mails (user_id, created_at desc);

create table if not exists public.notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ── 6. 가입 시 프로필/환영 우편 자동 생성 ───────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nick text := nullif(trim(new.raw_user_meta_data->>'nickname'), '');
begin
  -- 이메일 가입은 가입 화면에서 받은 닉네임을 쓰고, 구글 로그인처럼 닉네임이 없으면 임시 닉네임(Wiz_xxxxxx, 10자)을 만든다.
  -- ※ 닉네임 제약이 2~12자이므로 임시 닉네임도 12자를 넘기면 가입 자체가 실패한다.
  if nick is null then
    loop
      nick := 'Wiz_' || substr(md5(random()::text || clock_timestamp()::text || new.id::text), 1, 6);
      exit when not exists (select 1 from public.profiles where lower(nickname) = lower(nick));
    end loop;
  end if;
  insert into public.profiles (id, nickname) values (new.id, nick);
  insert into public.mails (user_id, kind, title, body)
  values (new.id, 'mail', '가입을 환영합니다!',
          '마법사 등록을 축하드려요. 마법서에서 덱 8장을 편성하고 첫 대전을 시작해보세요.');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
-- RLS (행 보안 정책)  — 모든 테이블 활성화
-- ════════════════════════════════════════════════════════════════════════
alter table public.profiles    enable row level security;
alter table public.decks       enable row level security;
alter table public.matches     enable row level security;
alter table public.friendships enable row level security;
alter table public.mails       enable row level security;
alter table public.notices     enable row level security;

-- profiles: 랭킹/친구 검색을 위해 로그인 유저 전체 조회 가능, 수정은 본인 닉네임만
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (nickname) on public.profiles to authenticated;   -- rating/wins/losses 직접 수정 차단

-- decks: 본인 것만
drop policy if exists decks_select_own on public.decks;
create policy decks_select_own on public.decks for select to authenticated using (user_id = auth.uid());
drop policy if exists decks_insert_own on public.decks;
create policy decks_insert_own on public.decks for insert to authenticated with check (user_id = auth.uid());
drop policy if exists decks_update_own on public.decks;
create policy decks_update_own on public.decks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- matches: 본인 전적 조회만. 기록은 record_match() 로만 가능 (insert 정책 없음)
drop policy if exists matches_select_own on public.matches;
create policy matches_select_own on public.matches for select to authenticated using (user_id = auth.uid());

-- friendships: 당사자만 조회 / 요청은 본인이 requester 일 때만 / 수락은 addressee 만 / 삭제는 당사자
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using (auth.uid() in (requester, addressee));
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending');
drop policy if exists friendships_accept on public.friendships;
create policy friendships_accept on public.friendships for update to authenticated
  using (addressee = auth.uid() and status = 'pending')
  with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete to authenticated
  using (auth.uid() in (requester, addressee));

-- mails: 본인 우편 조회/삭제. 수정은 read 컬럼만. 초대는 '친구'에게만 보낼 수 있음
drop policy if exists mails_select_own on public.mails;
create policy mails_select_own on public.mails for select to authenticated using (user_id = auth.uid());
drop policy if exists mails_update_own on public.mails;
create policy mails_update_own on public.mails for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.mails from authenticated;
grant  update (read) on public.mails to authenticated;
drop policy if exists mails_delete_own on public.mails;
create policy mails_delete_own on public.mails for delete to authenticated using (user_id = auth.uid());
drop policy if exists mails_insert_invite on public.mails;
create policy mails_insert_invite on public.mails for insert to authenticated
  with check (
    kind = 'invite' and from_user = auth.uid()
    and exists (
      select 1 from public.friendships f
       where f.status = 'accepted'
         and ((f.requester = auth.uid() and f.addressee = mails.user_id)
           or (f.addressee = auth.uid() and f.requester = mails.user_id))
    )
  );

-- notices: 전체 공개 조회, 작성은 대시보드(service_role)에서만
drop policy if exists notices_select on public.notices;
create policy notices_select on public.notices for select to authenticated using (true);

-- ── 샘플 공지 ───────────────────────────────────────────────────────────
insert into public.notices (title, body) values
  ('[공지] 프로토타입 테스트 안내', E'현재 War of Wizards 프로토타입 테스트 중입니다.\n버그는 팀 노션 QA 페이지에 남겨주세요.'),
  ('[공지] 스킬 19종 · 덱 규칙', E'덱은 19종 중 8장, 고위력 스킬은 최대 2장까지 편성할 수 있습니다.\n고위력 스킬은 게임당 스킬별 3회까지 시전 가능합니다.');
