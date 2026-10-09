-- loots-municipality: season x assigned municipality x species. Rules:
--  * live rows only (loot and MPV deleted_at IS NULL, as the hectares in 10_areas); published seasons only (>= 2024/2025);
--  * n = getLootAmount = amount, or (paper ? 0 : 1) when amount is 0/NULL; sick/injured kills are included;
--  * paper row = hunting_member_id IS NULL AND app <> 'PROXY' (API isPaperDataLoot);
--  * 'Kita' (animal 39) excluded here, published separately by 21_loots_kita.sql;
--  * found dead (deceasedAnimalCount) and of them by roads (carAccidentCount) are paper sub-counts, NOT in n;
--  * sex/age: paper attributes.amount{MALE,FEMALE,JUNIOR}, else the quota's single category; app attributes.category;
--    only for HORNED/EXTENDED species (ungulates), NULL otherwise.
WITH s AS (
  SELECT id, extract(year FROM start_date AT TIME ZONE 'Europe/Vilnius')::int AS season
  FROM seasons WHERE deleted_at IS NULL AND extract(year FROM start_date AT TIME ZONE 'Europe/Vilnius') >= 2024),
l AS (
  SELECT s.season, h.municipality_id AS muni, l.animal_id AS sp, l.attributes AS at, l.limited_animal_id,
         (l.hunting_member_id IS NULL AND l.app::text <> 'PROXY') AS paper,
         COALESCE(NULLIF(l.amount, 0),
                  CASE WHEN l.hunting_member_id IS NULL AND l.app::text <> 'PROXY' THEN 0 ELSE 1 END) AS n
  FROM loots l
  JOIN s ON s.id = l.season_id
  JOIN hunting_areas h ON h.id = l.hunting_area_id
  WHERE l.deleted_at IS NULL AND h.deleted_at IS NULL AND l.animal_id <> 39),
am AS (  -- paper sex/age object, or empty
  SELECT l.*, CASE WHEN jsonb_typeof(l.at->'amount') = 'object' THEN l.at->'amount' ELSE '{}'::jsonb END AS amo
  FROM l),
cat AS (
  SELECT season, muni, sp, e.k AS cat, e.v::int AS n
  FROM am, jsonb_each_text(am.amo) e(k, v)
  WHERE am.paper AND e.v ~ '^\d+$' AND e.v::int > 0
  UNION ALL
  SELECT am.season, am.muni, am.sp, la.categories->>0, am.n
  FROM am JOIN limited_animals la ON la.id = am.limited_animal_id
  WHERE am.paper AND am.n > 0 AND jsonb_typeof(la.categories) = 'array' AND jsonb_array_length(la.categories) = 1
    AND COALESCE((SELECT sum(v::int) FROM jsonb_each_text(am.amo) x(k, v) WHERE v ~ '^\d+$'), 0) = 0
  UNION ALL
  SELECT season, muni, sp, at->>'category', n FROM am WHERE NOT paper AND at ? 'category'),
catc AS (
  SELECT c.season, c.muni, c.sp,
         sum(c.n) FILTER (WHERE c.cat = 'MALE') AS m,
         sum(c.n) FILTER (WHERE c.cat = 'FEMALE') AS f,
         sum(c.n) FILTER (WHERE c.cat = 'JUNIOR') AS j
  FROM cat c JOIN animals a ON a.id = c.sp AND a.form_type::text IN ('HORNED', 'EXTENDED')
  GROUP BY 1, 2, 3),
cell AS (
  SELECT season, muni, sp,
         sum(n) AS n,
         COALESCE(sum(n) FILTER (WHERE paper), 0) AS paper,
         COALESCE(sum(n) FILTER (WHERE NOT paper), 0) AS app,
         sum(CASE WHEN paper AND at->>'deceasedAnimalCount' ~ '^\d+$' THEN (at->>'deceasedAnimalCount')::int ELSE 0 END) AS dead,
         sum(CASE WHEN paper AND at->>'carAccidentCount'    ~ '^\d+$' THEN (at->>'carAccidentCount')::int    ELSE 0 END) AS road
  FROM l GROUP BY 1, 2, 3)
SELECT c.season, c.muni, c.sp, c.n, c.paper, c.app, k.m, k.f, k.j, c.dead, c.road
FROM cell c LEFT JOIN catc k USING (season, muni, sp)
WHERE c.n > 0 OR c.dead > 0
ORDER BY 1, 2, 3;
