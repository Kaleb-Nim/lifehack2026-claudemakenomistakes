-- Demo seed for the merchant dashboard. Figures match
-- docs/CANONICAL-DEMO-DATA.md §5. Run after 001-add-shopper-handle.sql.
--
-- Paid subtotal $2,822 · held $1,049 · fees $59.26 · payout $2,762.74.
-- Times are today, Singapore time.

delete from orders where merchant_name = 'Bizgram Asia';

insert into orders
  (telegram_user_id, telegram_chat_id, shopper_handle, merchant_name,
   product_name, product_ref, amount_cents, currency, status, created_at)
values
  (100001, 100001, '@limjy',    'Bizgram Asia', 'ASUS Vivobook 15 (X1504VA)', 'student promo −$50',  79900, 'SGD', 'paid', (current_date + time '10:12') at time zone 'Asia/Singapore'),
  (100002, 100002, '@keisha',   'Bizgram Asia', 'Acer Swift Go 14',           null,                 129900, 'SGD', 'paid', (current_date + time '11:03') at time zone 'Asia/Singapore'),
  (100003, 100003, '@desmond.k','Bizgram Asia', 'Anker 7-in-1 USB-C hub',     null,                   8900, 'SGD', 'paid', (current_date + time '11:20') at time zone 'Asia/Singapore'),
  (100004, 100004, '@weiling',  'Bizgram Asia', 'TP-Link Archer AX55',        null,                  12900, 'SGD', 'paid', (current_date + time '12:05') at time zone 'Asia/Singapore'),
  (100005, 100005, '@nurul',    'Bizgram Asia', 'Logitech MX Master 3S',      null,                  12900, 'SGD', 'paid', (current_date + time '13:14') at time zone 'Asia/Singapore'),
  (100006, 100006, '@jaslyn',   'Bizgram Asia', 'Samsung 990 Pro 1 TB',       null,                  15900, 'SGD', 'paid', (current_date + time '14:02') at time zone 'Asia/Singapore'),
  (100007, 100007, '@shaun.t',  'Bizgram Asia', 'Crucial 16 GB DDR5',         null,                   7900, 'SGD', 'paid', (current_date + time '14:40') at time zone 'Asia/Singapore'),
  (100008, 100008, '@mkhoo',    'Bizgram Asia', 'Lenovo IdeaPad Slim 5',      'card declined once', 104900, 'SGD', 'held', (current_date + time '15:22') at time zone 'Asia/Singapore'),
  (100009, 100009, '@priya',    'Bizgram Asia', 'Samsung T7 1 TB',            null,                  13900, 'SGD', 'paid', (current_date + time '16:08') at time zone 'Asia/Singapore');
