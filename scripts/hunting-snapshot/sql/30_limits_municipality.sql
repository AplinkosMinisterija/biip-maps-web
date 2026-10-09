-- limits-municipality: moose (the only PER_HUNTING_AREA species) per season x assigned municipality.
-- Limit per MPV x category (M = patinai; FJ = patelės ir jaunikliai). Use recomputed from live loots on the quota
-- (getLootAmount), never from event counters. FULL JOIN keeps use without a limit row.
-- left_* = sum over MPV of max(limit - used, 0), so over-use in one MPV never cancels unused limit in another.
-- Only municipality sums leave the DB (per-MPV use is a pending naming decision).
WITH s AS (
  SELECT id, extract(year FROM start_date AT TIME ZONE 'Europe/Vilnius')::int AS season
  FROM seasons WHERE deleted_at IS NULL AND extract(year FROM start_date AT TIME ZONE 'Europe/Vilnius') >= 2024),
q AS (
  SELECT la.id, s.season, CASE WHEN la.categories::jsonb ? 'MALE' THEN 'M' ELSE 'FJ' END AS cat
  FROM limited_animals la JOIN s ON s.id = la.season_id
  WHERE la.deleted_at IS NULL AND la.type = 'PER_HUNTING_AREA'),
lim AS (
  SELECT q.season, q.cat, hala.hunting_area_id AS ha, sum(hala."limit") AS lim
  FROM hunting_area_limited_animals hala JOIN q ON q.id = hala.limited_animal_id
  WHERE hala.deleted_at IS NULL GROUP BY 1, 2, 3),
used AS (
  SELECT q.season, q.cat, l.hunting_area_id AS ha,
         sum(COALESCE(NULLIF(l.amount, 0), CASE WHEN l.hunting_member_id IS NULL AND l.app::text <> 'PROXY' THEN 0 ELSE 1 END)) AS used
  FROM loots l JOIN q ON q.id = l.limited_animal_id
  WHERE l.deleted_at IS NULL GROUP BY 1, 2, 3),
cell AS (
  SELECT season, cat, ha, COALESCE(lim.lim, 0) AS lim, COALESCE(used.used, 0) AS used
  FROM lim FULL JOIN used USING (season, cat, ha))
SELECT c.season, h.municipality_id AS muni,
       count(DISTINCT c.ha) FILTER (WHERE c.lim > 0) AS mpv_with_limit,
       COALESCE(sum(c.lim)  FILTER (WHERE c.cat = 'M'), 0)  AS lim_m,
       COALESCE(sum(c.lim)  FILTER (WHERE c.cat = 'FJ'), 0) AS lim_fj,
       COALESCE(sum(c.used) FILTER (WHERE c.cat = 'M'), 0)  AS used_m,
       COALESCE(sum(c.used) FILTER (WHERE c.cat = 'FJ'), 0) AS used_fj,
       COALESCE(sum(greatest(c.lim - c.used, 0)) FILTER (WHERE c.cat = 'M'), 0)  AS left_m,
       COALESCE(sum(greatest(c.lim - c.used, 0)) FILTER (WHERE c.cat = 'FJ'), 0) AS left_fj
FROM cell c JOIN hunting_areas h ON h.id = c.ha
WHERE h.deleted_at IS NULL  -- same MPV set as the hectare denominator (10_areas)
GROUP BY 1, 2
ORDER BY 1, 2;
