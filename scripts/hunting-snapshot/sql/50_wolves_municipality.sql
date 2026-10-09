-- wolves-municipality: dated, located wolves (BIOMON + app/PROXY, the AM "Sumedžioti vilkai" basis) per season x
-- municipality, by the raw point inside the DB. Used for Apžvalga/other-topic rows and as the Vilkai fallback when
-- /wolfs fails (BIOMON FDW cut-off). Paper aggregate rows (geom IS NULL) are excluded.
WITH w AS (
  SELECT w.season_id, w.geom,
         CASE WHEN extract(month FROM w.registered_at AT TIME ZONE 'Europe/Vilnius') >= 4
              THEN extract(year FROM w.registered_at AT TIME ZONE 'Europe/Vilnius')::int
              ELSE extract(year FROM w.registered_at AT TIME ZONE 'Europe/Vilnius')::int - 1 END AS season
  FROM wolfs w)
SELECT season,
       (SELECT m.code FROM boundaries.municipalities m
         WHERE ST_Intersects(m.geom, ST_Transform(w.geom, ST_SRID(m.geom))) LIMIT 1) AS muni,
       count(*) AS located
FROM w WHERE w.geom IS NOT NULL AND season >= 2017
GROUP BY 1, 2 ORDER BY 1, 2;
