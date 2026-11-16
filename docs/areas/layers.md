# layers — area note

Every map layer the app can draw — base maps, WMS/ArcGIS overlays, vector tiles — and the per-route lists that decide which of them a given map offers.

## Files that matter

- `src/utils/layers/base.ts` — geoportal/NŽT base maps, orthophoto years, GRPK, the two forest services
- `src/utils/layers/theme.ts` — domain WMS services (rūšys, UETK, STVK, gamtotvarka, parcels, municipalities)
- `src/utils/layers/vector-tiles.ts` — PMTiles/MVT layers (`*ServiceVT`)
- `src/utils/layers/index.ts` — re-exports all four modules; this barrel **is** the layer registry
- `src/plugins/map.ts` — `import * as allLayers` → `mapLayers.setLayers(allLayers)`
- `src/utils/map/layers.ts` — `MapLayers`: `add`, `toggleVisibility`, `setSublayers`, `filters`, `getFeatureInfo`
- `src/composables/useLayersToggle.ts` + `src/components/ui/map/layer/toggle/*` — the layers menu
- `src/routes/*.vue` — each route owns a `toggleLayers` array (menu) and a `mapLayers.add(...)` chain (registration)

## Invariants

- **An export's name must equal its `id`.** `src/plugins/map.ts` registers the module namespace, so `mapLayers.get(id)` resolves by export name (`layers/index.ts › allLayers`). Renaming a layer means renaming the export, the `id` field and any `layer.set('id', …)` together.
- A layer appears on a map only if the route both lists it in `toggleLayers` and registers it with `mapLayers.add(id)`; `add` throws `Layer not found` for an unknown id (`map/layers.ts › MapLayers.add`).
- Sublayer switches render only while the parent layer is visible (`layer/toggle/Item.vue`), so a sublayer cannot be verified through the UI with the parent switched off.
- Layer visibility is not persisted — not in the URL, not in storage. Ids may be renamed without breaking shared links.
- Layer objects are module-level singletons: two routes listing the same export share one OpenLayers layer instance.

## Contract

- WMS (`getWMSImageLayer`) and ArcGIS (`ImageArcGISRest`) layers are reprojected by the server — they work on both the LKS and the Web Mercator maps.
- **Vector tiles are not reprojected.** OpenLayers 9 throws `A VectorTile source can only be rendered if it has a projection compatible with the view projection` and draws nothing. Every `*ServiceVT` layer is EPSG:3857, so it may only be used on a route whose `<UiMap :projection="projection3857">`: `index`, `alis/*`, `hunting/*`, `medziokle/*`, `animals/*`, `zuvinimas/*`, `smalsuolis`, `zvejyba/*`. The LKS (EPSG:3346) routes — `rusys`, `edit`, `gamtotvarka`, `uetk`, `szns/*`, `tourism` — need a WMS/ArcGIS layer instead.
- Forest data lives in two geoportal services: `vmt_mkd` serves Kvartalai (`0`) and Miško sklypai (`1`) only; `vmt_valst_reiksmes_miskai` serves the rest, with Girininkijų ribos as sublayer `2`.
- Cadastral parcels, three different sources: `rcParcelsService` (QGIS WMS over `import.rc_sklypai`, EPSG:3346, drawn below 1:25 000), `parcelsServiceVT` (PMTiles, 3857 only), `inspireParcelService` (INSPIRE WMS, refreshed once a year).

## Traps

- `import.rc_sklypai` is filled by `biip-infra/.github/workflows/sync-geoportal-rc.yml` — cron `0 20 15 * *`, i.e. **monthly**, from `geoportal.lt/download/opendata/RC/RC_atviri_sklypai.zip`. "Is this layer fresh?" is a question about that workflow, not about the map.
- `boundaries.biip.lt/tiles/*.pmtiles` mirrors `govlt/national-boundaries` releases (~2×/month). Its `planetiler:buildtime` metadata says 2024 and is **stale metadata**, not the data vintage — compare the file size against the release asset instead.
- `/edit` is one shared route: biip-rusys-web (observation + request forms), biip-admin-web (species and žuvinimas draw) and biip-uetk-web all embed it. A change to its layer list reaches all of them. Medžioklė has its own copy at `routes/medziokle/edit.vue`.
- An ArcGIS layer only requests its image once the view has a centre and a resolution; after a programmatic `toggleVisibility` nothing is fetched until the map renders again. When verifying in a browser, move the view (a `wheel` event on `map.getViewport()` is enough) before concluding the layer is broken.
- `gamtotvarkaStvk*` sub-services exist as separate exports only so the nested menu can find them by id; they are plain WMS layers and may be used standalone (`stvkEbBuveines` is used that way by `rusys` and `edit`).

_Updated 2026-11-13._
