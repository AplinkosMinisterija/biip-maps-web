import { GeoJSON } from 'ol/format';

export * from './search';
import _ from 'lodash';

export function splitUrlIfNeeded(url: string, headers?: any) {
  let method = 'GET';
  let body: any;

  if (typeof headers === 'function') {
    headers = headers() || {};
  }

  headers = headers || {};

  const src = new URL(url, window?.location?.href);
  if (url.length > 2000) {
    method = 'POST';
    body = src.search.slice(1);
    url = src.origin + src.pathname;
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return {
    url,
    method,
    body,
    headers,
  };
}

export function loadWMSLayer(url: string, options = {}, toFeatures = true) {
  const { method, body, headers, url: requestUrl } = splitUrlIfNeeded(url);

  options = _.merge({}, options, {
    method,
    body,
    headers,
  });

  return new Promise((resolve, reject) => {
    fetch(requestUrl, options)
      .then((response) => response.json())
      .then((json) => (toFeatures ? (json && json.features) || [] : json))
      .then((features) => {
        resolve(features);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export function loadWFSLayer(url: string, body: any, options = {}) {
  return new Promise((resolve, reject) => {
    fetch(url, {
      ...options,
      method: 'POST',
      body: new XMLSerializer().serializeToString(body),
    })
      .then((response) => response.json())
      .then((json) => {
        resolve(json);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export function loadFeaturesCollection(url: string, options = {}) {
  return new Promise((resolve, reject) => {
    fetch(url, options)
      .then((response) => response.json())
      .then((featuresCollection) => {
        resolve(featuresCollection);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export function checkAuth(url: string, options = {}) {
  return new Promise((resolve) => {
    fetch(url, {
      ...options,
      method: 'OPTIONS',
    })
      .then((res) => {
        if (res.ok && res.status >= 200 && res.status < 300) {
          return resolve(res.json());
        }
        resolve(false);
      })
      .catch(() => {
        resolve(false);
      });
  });
}

export function serializeQuery(obj: any) {
  const str = [];

  function convertValue(value: any) {
    if (Array.isArray(value)) {
      value = `[${value.map((i) => convertValue(i)).join(',')}]`;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      value = JSON.stringify(value);
    }

    return value;
  }

  for (const p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(convertValue(obj[p])));
    }
  }
  const result = str.join('&');
  return result.length > 0 ? result : '';
}

export function wmsImageLoaderFn(headers?: any) {
  return function (image: any, src: string) {
    const { method, body, headers: requestHeaders, url } = splitUrlIfNeeded(src, headers);

    fetch(url, {
      method,
      headers: requestHeaders,
      body,
    })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        image.getImage().src = blobUrl;
      });
  };
}

export function geosjonLoaderFn(
  url: string,
  cb: Function,
  queryOptions: Function = () => ({}),
  dataProjection?: string,
) {
  return function (extent: any, resolution: any, projection: any, success: any, failure: any) {
    if (!url) {
      return success();
    }
    fetch(url, queryOptions())
      .then((res) => res.json())
      .then((res) =>
        new GeoJSON().readFeatures(res.geom || res, {
          dataProjection: dataProjection || projection,
          featureProjection: projection,
        }),
      )
      .then((data) => {
        cb(data);
        success(data);
      })
      .catch(() => failure());
  };
}
