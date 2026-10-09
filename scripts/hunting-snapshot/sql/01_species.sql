-- species: animals that occur in live loots of published seasons. 'Kita' (id 39) is listed with is_other = true
-- so the client can footnote it; it never appears as a species row.
SELECT a.id, a.name, a.form_type::text AS form_type, (a.id = 39) AS is_other
FROM animals a
WHERE a.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM loots l JOIN seasons s ON s.id = l.season_id
              WHERE l.animal_id = a.id AND l.deleted_at IS NULL
                AND extract(year FROM s.start_date AT TIME ZONE 'Europe/Vilnius') >= 2024)
ORDER BY a.id;
