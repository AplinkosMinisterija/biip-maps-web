-- areas-municipality: live MPV per assigned municipality. Only counts and summed area leave the DB.
SELECT h.municipality_id AS muni, count(*) AS mpv_count,
       round(sum(h.area))::bigint AS mpv_ha,
       count(*) FILTER (WHERE h.area < 500) AS mpv_small
FROM hunting_areas h
WHERE h.deleted_at IS NULL
GROUP BY 1
ORDER BY 1;
