-- loots-kita: national 'Kita' (species not stated) per season, for the footnote only.
SELECT extract(year FROM s.start_date AT TIME ZONE 'Europe/Vilnius')::int AS season,
       sum(COALESCE(NULLIF(l.amount, 0), CASE WHEN l.hunting_member_id IS NULL AND l.app::text <> 'PROXY' THEN 0 ELSE 1 END)) AS n,
       sum(CASE WHEN l.hunting_member_id IS NULL AND l.app::text <> 'PROXY' AND l.attributes->>'deceasedAnimalCount' ~ '^\d+$'
                THEN (l.attributes->>'deceasedAnimalCount')::int ELSE 0 END) AS dead
FROM loots l JOIN seasons s ON s.id = l.season_id
WHERE l.deleted_at IS NULL AND l.animal_id = 39 AND s.deleted_at IS NULL
  AND extract(year FROM s.start_date AT TIME ZONE 'Europe/Vilnius') >= 2024
GROUP BY 1 ORDER BY 1;
