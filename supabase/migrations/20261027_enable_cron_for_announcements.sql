-- Applied 2026-10-27: pg_cron calls the LINE bot every 5 minutes to send queued announcements
-- (replaces a GAS time trigger, which needed extra Google authorization).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep cron run history small: drop entries older than 7 days, daily at 03:00 UTC
select cron.schedule(
  'cleanup-cron-history',
  '0 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);

-- The announcement job holds the bot URL and CRON_SECRET, so it is created by hand
-- in the SQL Editor and not committed:
--
-- select cron.schedule(
--   'cd-notify-announcements',
--   '*/5 * * * *',
--   $$select net.http_get(
--       url := '<BOT_WEB_APP_URL>?action=process_announcements&key=<CRON_SECRET>',
--       timeout_milliseconds := 30000
--     )$$
-- );
