import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';

export const projection = 'EPSG:3346';

proj4.defs(
  projection,
  '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9998 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
);
register(proj4);
