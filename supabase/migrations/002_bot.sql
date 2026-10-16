-- Kindset bot (run once in Supabase → SQL Editor)
alter table chapters add column if not exists telegram_chat_id bigint;   -- group set with /connect
alter table events   add column if not exists reminded_at timestamptz;   -- reminder sent once per night
