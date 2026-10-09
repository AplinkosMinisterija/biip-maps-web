-- damages-season: damage REPORTS (not assessed damage), season x municipality x group, with roll-ups.
-- * season and month from the Vilnius-local event date (date_time), never season_id; future dates excluded;
-- * municipality from the point, or ST_PointOnSurface for polygons (SRID-safe);
-- * group from the reported species; legacy 'Kanopiniai ...' values fold into kanopiniai;
-- * the reporter key (md5 of the normalised e-mail) is used ONLY inside count(DISTINCT) and never leaves the query;
-- * reporters are published only for (season, municipality), (season, group) and (season) and only when >= 3;
--   at (season, municipality, group) the column is always NULL;
-- * escalated = elderships_notified (for predators and bison the letter is automatic; the UI uses it only for
--   kanopiniai and bebrai).
-- * small-cell suppression (owner decision 2026-10-09): every published count of 1 or 2 (reports, reporters,
--   escalated) leaves the DB as NULL and is shown as '<3'; 0 stays 0. Every row is computed on unsuppressed data,
--   so a total can be larger than the sum of its published parts.
WITH d AS (
  SELECT (dm.date_time AT TIME ZONE 'Europe/Vilnius')::date AS day,
         CASE WHEN dm.species = 'Vilkai' THEN 'vilkai' WHEN dm.species = 'Lūšys' THEN 'lusys'
              WHEN dm.species = 'Rudieji lokiai' THEN 'lokiai' WHEN dm.species = 'Stumbrai' THEN 'stumbrai'
              WHEN dm.species = 'Bebrai' THEN 'bebrai' ELSE 'kanopiniai' END AS grp,
         dm.elderships_notified AS esc,
         md5(lower(trim(dm.email))) AS rk,
         (SELECT m.code FROM boundaries.municipalities m
           WHERE ST_Intersects(m.geom, ST_Transform(ST_PointOnSurface(dm.geom), ST_SRID(m.geom))) LIMIT 1) AS muni
  FROM damages dm
  WHERE dm.deleted_at IS NULL AND dm.date_time >= '2025-03-31 21:00+00'),
x AS (
  SELECT d.*, CASE WHEN extract(month FROM day) >= 4 THEN extract(year FROM day)::int
                   ELSE extract(year FROM day)::int - 1 END AS season
  FROM d WHERE day <= (now() AT TIME ZONE 'Europe/Vilnius')::date)
SELECT season,
       CASE WHEN GROUPING(muni) = 1 THEN 0 ELSE muni END AS muni,
       CASE WHEN GROUPING(grp) = 1 THEN '*' ELSE grp END AS grp,
       CASE WHEN count(*) NOT IN (1, 2) THEN count(*) END AS reports,
       CASE WHEN GROUPING(muni) = 0 AND GROUPING(grp) = 0 THEN NULL
            WHEN count(DISTINCT rk) >= 3 THEN count(DISTINCT rk) END AS reporters,
       CASE WHEN count(*) FILTER (WHERE esc) NOT IN (1, 2) THEN count(*) FILTER (WHERE esc) END AS escalated
FROM x
GROUP BY GROUPING SETS ((season, muni, grp), (season, muni), (season, grp), (season))
ORDER BY 1, 2, 3;
