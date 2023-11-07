import { createApp, h, inject } from 'vue';
import { srisPrivateService } from './layers';
import _ from 'lodash';
import IconComponent from '@/components/ui/Icon.vue';

export function renderIconHtml(name: string, props: any = {}) {
  const tempApp = createApp({
    render() {
      return h(IconComponent, { name, ...props });
    },
  });

  const el = document.createElement('div');
  const mountedApp = tempApp.mount(el);

  return new XMLSerializer().serializeToString(mountedApp.$el);
}

export function getCopyrightLabel(title: string, link: string) {
  return `© <a href="${link}">${title}</a>`;
}

export function validateSrisAuth(token?: string): Promise<any> {
  return new Promise(async function (resolve) {
    const mapLayers: any = inject('mapLayers');
    if (!token) return resolve(false);

    const user = await mapLayers.validateLayer(srisPrivateService.id, token);

    if (!user?.id) return resolve(false);

    resolve(user);
  });
}

export function objectPropsToCamel(data: any | any[]) {
  const objToCamel = (obj: any) =>
    Object.entries(obj).reduce((carry: any, [key, value]) => {
      carry[_.camelCase(key)] = value;

      return carry;
    }, {});

  if (Array.isArray(data)) return data.map(objToCamel);
  return objToCamel(data);
}

export function canvasToImage() {
  [].forEach.call(
    document.getElementsByTagName('canvas'),
    function (element: HTMLCanvasElement, index: number) {
      const dataUrl = element.toDataURL();
      const image = document.createElement('img');
      image.src = dataUrl;
      image.id = `image-canvas-${index}`;

      const properties = [
        'width',
        'height',
        'position',
        'left',
        'top',
      ] as const;
      properties.forEach((key) => (image.style[key] = element.style[key]));
      image.className = element.className;

      element.parentNode?.insertBefore(image, element);
      element.parentNode?.removeChild(element);
    },
  );
}

export function searchInObject(
  search: string,
  obj: { [key: string]: any },
  fields: string[],
) {
  const regex = new RegExp(
    search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'),
    'i',
  );

  const testValue = (value: string | string[]) => {
    if (!value) return false;
    else if (Array.isArray(value)) return value.some(testValue);
    return regex.test(value);
  };

  const hits = fields.filter((f) => testValue(obj[f]));
  return {
    hits,
    found: hits?.length > 0,
  };
}

export const SpeciesTypes: any = {
  INTRODUCED: 'Svetimžemė',
  ENDANGERED: 'Saugoma',
  INVASIVE: 'Invazinė',
};
