-- damages-month: NATIONAL month x group report counts (seasonality chart). No municipality at month grain.
-- Counts of 1 or 2 leave the DB as NULL ('<3', owner decision 2026-10-09).
WITH x AS (
  SELECT to_char(dm.date_time AT TIME ZONE 'Europe/Vilnius', 'YYYY-MM') AS ym,
         CASE WHEN dm.species = 'Vilkai' THEN 'vilkai' WHEN dm.species = 'Lūšys' THEN 'lusys'
              WHEN dm.species = 'Rudieji lokiai' THEN 'lokiai' WHEN dm.species = 'Stumbrai' THEN 'stumbrai'
              WHEN dm.species = 'Bebrai' THEN 'bebrai' ELSE 'kanopiniai' END AS grp
  FROM damages dm
  WHERE dm.deleted_at IS NULL AND dm.date_time >= '2025-03-31 21:00+00'
    AND (dm.date_time AT TIME ZONE 'Europe/Vilnius')::date <= (now() AT TIME ZONE 'Europe/Vilnius')::date)
SELECT ym, grp, CASE WHEN count(*) NOT IN (1, 2) THEN count(*) END AS reports FROM x GROUP BY 1, 2 ORDER BY 1, 2;
