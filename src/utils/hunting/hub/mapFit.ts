// The "whole Lithuania" view of the hub map. Every country fit is remembered per view, so a
// later change of the free map area (a sheet that measured itself, a resize, a table drawer)
// fits the country again instead of only re-centring it, as long as nobody has panned or
// zoomed since. Pure module: no Vue imports.
import type View from 'ol/View';

const fits = new WeakMap<View, { center: number[]; resolution: number }>();

/** Remember the view's current centre and resolution as the country fit. */
export function markCountryFit(view: View) {
  const center = view.getCenter();
  const resolution = view.getResolution();
  if (center && resolution) fits.set(view, { center: [...center], resolution });
}

/**
 * True while the view still shows the last country fit. Read it before changing the view
 * padding: OpenLayers moves the centre when the padding changes.
 */
export function atCountryFit(view: View) {
  const fit = fits.get(view);
  const center = view.getCenter();
  const resolution = view.getResolution();
  if (!fit || !center || !resolution) return false;
  const halfPixel = fit.resolution / 2;
  return (
    Math.abs(resolution - fit.resolution) < fit.resolution * 1e-6 &&
    Math.abs(center[0] - fit.center[0]) < halfPixel &&
    Math.abs(center[1] - fit.center[1]) < halfPixel
  );
}
