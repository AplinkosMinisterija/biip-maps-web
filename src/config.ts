export const qgisServerHost = import.meta.env.VUE_APP_QGIS_SERVER || 'https://gis.biip.lt';
export const smalsuolisHost = import.meta.env.VUE_APP_SMALSLUOLIS_HOST || 'https://smalsuolis.lt';

const proxyUrl = import.meta.env.VUE_APP_PROXY_BASE_URL ?? '/proxy';

export const uetkApiHost = `${proxyUrl}/uetk`;
export const rusysApiHost = `${proxyUrl}/rusys`;
export const gyvunaiApiHost = `${proxyUrl}/gyvunai`;
export const zvejybaApiHost = `${proxyUrl}/zvejyba`;
export const zuvinimasApiHost = `${proxyUrl}/zuvinimas`;
export const medziokleApiHost = `${proxyUrl}/medziokle`;
export const qgisServerUrl = `${qgisServerHost}/qgisserver`;
export const qgisApiUrl = `${qgisServerHost}/api`;
export const qgisTilesUrl = `${qgisServerHost}/tiles`;
