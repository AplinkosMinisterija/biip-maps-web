export const qgisServerHost =
  import.meta.env.VUE_APP_QGIS_SERVER || 'https://gis.biip.lt';
export const apiServerHost =
  import.meta.env.VUE_APP_API_HOST || 'https://internalapi.biip.lt';
export const uetkApiHost = `${apiServerHost}/uetk`;
export const rusysApiHost = `${apiServerHost}/rusys`;
export const qgisServerUrl = `${qgisServerHost}/qgisserver`;