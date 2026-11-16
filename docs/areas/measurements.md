# measurements — area note

The length and area labels OpenLayers draws on top of a feature while it is being drawn or measured.

## Files that matter

- `src/utils/layers/styles/measurements.ts` — `getMeasurementStyles` builds the label and segment styles; `formatLength` / `formatArea` own the units
- `src/utils/layers/vector.ts` — `getLayerStyles` forwards its `showMeasurements` options into the style function
- `src/utils/map/draw.ts` — `MapDraw.enableMeasurements` is what a route calls
- `src/routes/edit.vue`, `src/routes/medziokle/edit.vue` — turn measurements on per the `showArea` query param, once a draw type is started
- `src/utils/map/layers.ts` — `MapLayers.toggleMeasuring` is the measuring-tool entry point

## Invariants

- A Polygon is labelled only when `showArea` is set, a LineString only when `showLength` is set, and a Point or LineString carrying a `bufferSize` gets the area of its buffer instead of its own measure (`measurements.ts › getMeasurementStyles`).
- Measurement styles are applied when a draw type STARTS (`edit.vue › toggleDrawType`), not when a feature arrives. A geometry pushed in through the `geom` message while no draw type is active therefore renders with no label — `edit.vue`'s `geom` handler re-enables them itself, but only when `areaUnit` was asked for, so no other host's map gains a label it does not have today.
- `formatArea` switches to km² above 10 000 m² unless the caller asks for `areaUnit: 'm2'`; `formatLength` switches to km above 100 m and has no such escape.

## Contract

- `/edit` query params: `showArea` (any truthy value) turns the area label on; `areaUnit=m2` keeps that label in square metres at every size. Any other value leaves the m²/km² switch alone.
- The only caller sending `areaUnit=m2` is `biip-rusys-web › ObservationForm/functions.ts › getMapPath`, and only for invasive plant forms (maps-web#265).
- `parseRouteParams` JSON-parses each value, so a non-JSON string such as `m2` arrives as the plain string.

## Traps

- The area is geodesic (`ol/sphere › getArea`), so a 500 × 500 m square in EPSG:3346 measures 248 973.58 m², not 250 000. Never assert an exact planar area.
- The label is painted into a canvas, so no DOM assertion can see it. Read it from the running map instead: `document.querySelector('#app').__vue_app__._context.provides.mapLayers.map`, walk the layer groups down to the vector layers, call each one's style function with the current resolution and read the `Text` of the returned styles.
- This repo has no test runner, so a change here is only ever proven in the browser.

_Updated 2026-11-13._
