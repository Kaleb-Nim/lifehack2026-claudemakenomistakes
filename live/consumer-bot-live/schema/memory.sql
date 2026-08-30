-- Durable facts about a shopper, carried across conversations and restarts.
--
-- This holds only what the shopper stated outright and the agent chose to
-- record via the `remember` tool. Purchase history is NOT duplicated here --
-- it is derived from the `orders` table, which is already ground truth and
-- cannot be hallucinated. See db/memory_db.py.
--
-- Apply with `supabase db push`, or paste into the SQL editor in the Supabase
-- dashboard.

create table if not exists user_memories (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  fact text not null check (length(trim(fact)) between 1 and 300),
  -- preference: a lasting like/dislike ("only uses Windows")
  -- constraint: a hard limit ("budget never above $1500", "must collect in person")
  -- context:    stable circumstance ("studies computer science", "works from home")
  category text not null check (category in ('preference', 'constraint', 'context')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_memories_user_idx
  on user_memories (telegram_user_id);

-- The agent will re-state the same fact across turns. Deduplicate on the
-- normalised text so repeated `remember` calls update rather than accumulate.
create unique index if not exists user_memories_user_fact_key
  on user_memories (telegram_user_id, lower(trim(fact)));

-- Same posture as `orders`: the bot is a trusted backend using the
-- service_role key, so RLS with no anon/authenticated policies keeps this
-- table unreachable from any public client.
alter table user_memories enable row level security;

drop trigger if exists user_memories_set_updated_at on user_memories;
create trigger user_memories_set_updated_at
  before update on user_memories
  for each row
  execute function set_updated_at();
