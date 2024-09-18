import type { GenericObject } from '@/types';
import shp from 'shpjs';
function getValue(item: any, props: string | string[], translates?: any) {
  if (!Array.isArray(props)) {
    props = [props];
  }
  const prop = props.find((p) => !!item[p]);
  if (!prop) return '';
  const value = item[prop];
  if (!value) return '';
  if (translates) {
    return translates[value] || '';
  }
  return value;
}

function removeNumericPrefixes(properties: GenericObject<any>) {
  return Object.keys(properties).reduce((acc: any, key: string) => {
    // remove numeric prefixes. E.g. `1. title` -> `title`
    const newKey = key.replace(/^\d+\.\s*/gi, '');
    acc[newKey] = properties[key];
    return acc;
  }, {});
}

export function convertUETKProperties(properties: GenericObject<any>): any | any[] {
  if (Array.isArray(properties)) {
    return properties.map((p: any) => convertUETKProperties(p));
  }

  properties = removeNumericPrefixes(properties);

  const categoryTranslates: any = {
    upes: 'Upės',
    ezerai_tvenkiniai: 'Ežerai tvenkiniai',
    vandens_matavimo_stotys: 'Vandens matavimo stotys',
    vandens_tyrimu_vietos: 'Vandens tyrimų vietos',
    zemiu_uztvanka: 'Žemių užtvanka',
    vandens_pertekliaus_pralaida: 'Vandens pertekliaus pralaida',
    zuvu_pralaida: 'Žuvų pralaida',
    hidroelektrines: 'Hidroelektrinės',
    upiu_pabaseiniai: 'Upių pabaseiniai',
    upiu_baseinu_rajonai: 'Upių baseinų rajonai',
    upiu_baseinai: 'Upių baseinai',
  };

  const values: GenericObject<string | string[]> = {
    title: 'Pavadinimas',
    cadastralId: ['Kadastro identifikavimo kodas', 'Hidrostatinio unikalus identifikatorius'],
    centerX: 'Centro X koordinatė (LKS-94), m',
    centerY: 'Centro Y koordinatė (LKS-94), m',
    mouthX: 'Žiočių X koordinatė (LKS-94), m',
    mouthY: 'Žiočių Y koordinatė (LKS-94), m',
    registredAt: 'Kadastro objekto registravimo data',
    riverSubbasin: 'Upės pabaseinis',
    area: 'Vandens paviršiaus be salų plotas, ha',
    length: ['Kranto linijos ilgis', 'Ilgis, km'],
  };

  const fields: GenericObject<any> = Object.keys(values).reduce(
    (acc: any, key: string) => ({
      ...acc,
      [key]: getValue(properties, values[key]),
    }),
    {},
  );

  return {
    category: categoryTranslates[properties.featureId?.split('.')?.[0]],
    ...fields,
  };
}

function readFile(file: File) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result);
    };
  });
}

export const GEOJSON_FILE_FORMATS = ['application/json', 'application/geo+json', '.geojson'];
export const SHAPEFILE_FILE_FORMATS = ['application/zip', 'application/x-zip-compressed'];

// sometimes these types are not provided
export const EXTENTION_BY_FILE_FORMAT = {
  'application/geo+json': 'geojson',
};

export function getFileExtention(file: File) {
  return file.name.split('.').pop();
}

export function isGeojsonFile(file: File) {
  if (!file.name) return false;

  if (file.type) {
    return GEOJSON_FILE_FORMATS.includes(file.type);
  }

  const extention = getFileExtention(file);
  if (!extention) return;

  return ['geojson'].includes(extention);
}

export function isShapeFile(file: File) {
  if (!file.name) return false;

  if (file.type) {
    return SHAPEFILE_FILE_FORMATS.includes(file.type);
  }
  return false;
}

export function readGeojsonFromFile(file: File) {
  return new Promise((resolve, reject) => {
    const emptyResponse = (text?: string) => reject(text);
    if (!isGeojsonFile(file)) emptyResponse('Įkeliamas failas nėra .geojson');

    readFile(file).then((data) => {
      const result = data as string;
      if (!result?.length) return emptyResponse('Tuščias .geojson failas');

      try {
        resolve(JSON.parse(result));
      } catch (err) {
        emptyResponse();
      }
    });
  });
}

export function readShapefileFromFile(file: File) {
  return new Promise(async (resolve, reject) => {
    const emptyResponse = (text?: string) => reject(text);
    if (!isShapeFile(file)) emptyResponse('Įkeliamas failas nėra Shapefile .zip archyvas');

    const buffer = await file.arrayBuffer().catch(() => emptyResponse('Nepavyko nuskaityti failo'));
    if (!buffer) return emptyResponse();

    const geojson = await shp(buffer).catch(() =>
      emptyResponse('Patikrinkite ar yra visi reikiami Shapefile failai .zip archyve '),
    );

    if (!geojson) return emptyResponse('Tuščias Shapefile failas');

    resolve(geojson);
  });
}
