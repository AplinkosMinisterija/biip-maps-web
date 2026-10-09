-- damages-attacked: livestock named in predator reports, NATIONAL only, season x predator group x class.
-- "entries" = report lines, "animals" = the stated counts (killed and injured are not distinguished in the form).
-- cls '*' = all classes of (season, group), computed on unsuppressed data (national totals, owner decision).
-- Suppression (owner decision 2026-10-09): entries of 1 or 2 leave the DB as NULL ('<3'); animals is NULL when its
-- entries are suppressed (it would describe one or two reports) or when the animal count itself is 1 or 2.
WITH x AS (
  SELECT CASE WHEN extract(month FROM dm.date_time AT TIME ZONE 'Europe/Vilnius') >= 4
              THEN extract(year FROM dm.date_time AT TIME ZONE 'Europe/Vilnius')::int
              ELSE extract(year FROM dm.date_time AT TIME ZONE 'Europe/Vilnius')::int - 1 END AS season,
         CASE dm.species WHEN 'Vilkai' THEN 'vilkai' WHEN 'Lūšys' THEN 'lusys' WHEN 'Rudieji lokiai' THEN 'lokiai' END AS grp,
         dm.attacked_animals
  FROM damages dm
  WHERE dm.deleted_at IS NULL AND dm.date_time >= '2025-03-31 21:00+00'
    AND dm.species IN ('Vilkai', 'Lūšys', 'Rudieji lokiai')
    AND (dm.date_time AT TIME ZONE 'Europe/Vilnius')::date <= (now() AT TIME ZONE 'Europe/Vilnius')::date),
a AS (
  SELECT season, grp, lower(trim(e->>'animal')) AS animal,
         CASE WHEN (e->>'count') ~ '^\d+$' THEN (e->>'count')::int ELSE 0 END AS n
  FROM x CROSS JOIN LATERAL json_array_elements(
         CASE WHEN json_typeof(x.attacked_animals) = 'array' THEN x.attacked_animals ELSE '[]'::json END) e),
c AS (
  SELECT season, grp, n,
    CASE WHEN animal IN ('avis','avys','avinas','ėriukas') THEN 'avys'
         WHEN animal IN ('ožka','ožkos','ožys','ožiukas') THEN 'ozkos'
         WHEN animal IN ('karvė','telyčia','telyčaitė','veršelis','buliukas','bulius','galvijas','galvijai') THEN 'galvijai'
         WHEN animal IN ('danielius','taurusis elnias','elnias','elniai') THEN 'elniai'
         WHEN animal IN ('alpaka','alpakos') THEN 'alpakos'
         WHEN animal IN ('arklys','kumelys','kumeliukas') THEN 'arkliai'
         ELSE 'kita' END AS cls
  FROM a)
SELECT season, grp,
  CASE WHEN GROUPING(cls) = 1 THEN '*' ELSE cls END AS cls,
  CASE WHEN count(*) NOT IN (1, 2) THEN count(*) END AS entries,
  CASE WHEN count(*) NOT IN (1, 2) AND sum(n) NOT IN (1, 2) THEN sum(n) END AS animals
FROM c
GROUP BY GROUPING SETS ((season, grp, cls), (season, grp))
ORDER BY 1, 2, GROUPING(cls) DESC, 3;
