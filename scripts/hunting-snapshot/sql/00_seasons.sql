-- seasons: BIIP seasons from 2024/2025 on (the 2023/24 pilot holds 1 loot row and is not published).
-- season = start year in Vilnius time (2025 = 2025/2026). db ids are resolved here, never hard-coded.
SELECT s.id AS season_id,
       extract(year FROM s.start_date AT TIME ZONE 'Europe/Vilnius')::int AS season,
       s.current
FROM seasons s
WHERE s.deleted_at IS NULL
  AND extract(year FROM s.start_date AT TIME ZONE 'Europe/Vilnius') >= 2024
ORDER BY 2;
