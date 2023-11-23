export const qgisServerHost =
  import.meta.env.VUE_APP_QGIS_SERVER || 'https://gis.biip.lt';
export const apiServerHost =
  import.meta.env.VUE_APP_API_HOST || 'https://internalapi.biip.lt';
export const uetkApiHost = `${apiServerHost}/uetk`;
export const rusysApiHost = `${apiServerHost}/rusys`;
export const gyvunaiApiHost = `${apiServerHost}/gyvunai`;
export const medziokleApiHost = `${apiServerHost}/medziokle`;
export const qgisServerUrl = `${qgisServerHost}/qgisserver`;
export const qgisApiUrl = `${qgisServerHost}/api`;
export const qgisTilesUrl = `${qgisServerHost}/tiles`;