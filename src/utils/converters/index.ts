import type { GenericObject } from '@/types';

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
