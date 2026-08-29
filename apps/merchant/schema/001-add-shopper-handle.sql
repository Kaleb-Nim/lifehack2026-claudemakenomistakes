-- Additive, non-breaking. The dashboard shows a shopper handle (@limjy) but
-- orders only carries telegram_user_id (a bigint), which is not presentable.
-- Nullable, so apps/consumer-bot-live keeps inserting unchanged.
alter table orders add column if not exists shopper_handle text;
