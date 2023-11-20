import { applyTransform } from 'ol/extent';
import { Projection, get, getTransform } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';

export const projection = 'EPSG:3346';
export const projection3857 = 'EPSG:3857';

proj4.defs(
  projection,
  '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9998 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
);
register(proj4);

const lksProjection = get(projection) as Projection;
const lksBbox = [56.45, 19.02, 53.89, 26.82];

const fromLonLat = getTransform('EPSG:4326', lksProjection);

let worldExtent = [lksBbox[1], lksBbox[2], lksBbox[3], lksBbox[0]];
lksProjection.setWorldExtent(worldExtent);

// approximate calculation of projection extent,
// checking if the world extent crosses the dateline
if (lksBbox[1] > lksBbox[3]) {
  worldExtent = [lksBbox[1], lksBbox[2], lksBbox[3] + 360, lksBbox[0]];
}
const extent = applyTransform(worldExtent, fromLonLat, undefined, 8);
lksProjection.setExtent(extent);
