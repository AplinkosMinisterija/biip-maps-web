import _ from 'lodash';
import { createMap } from '@/utils';
import * as allLayers from '@/utils/layers';
import 'ol/ol.css';
import type { Map } from 'ol';
import { useMapsStore } from '@/stores/map';
import { watch } from 'vue';

let map: Map;

function getDiffKeys(obj1: any, obj2: any) {
  return [...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((key) => !_.isEqual(obj1[key], obj2[key]));
}

export default {
  install(app: any) {
    const mapStore = useMapsStore();
    const { mapLayers } = mapStore;
    let unwatch: any;
    mapLayers.setLayers(allLayers);
    app.directive('map', (el: any, binding: any) => {
      const value = binding?.value || {};
      el.style.height = value.height || '100vh';
      el.style.width = value.width || '100vw';
      el.style.background = value.background || '#ffffff';

      if (!map) {
        map = createMap(el, value);
        mapLayers.setMap(map);
      }

      let timeout: any;
      if (unwatch) {
        unwatch();
      }
      unwatch = watch(
        () => mapLayers.allFilters(),
        (val, oldVal) => {
          clearTimeout(timeout);
          if (_.isEqual(val, oldVal)) return;

          timeout = setTimeout(() => {
            if (!oldVal) {
              mapLayers.updateLayersQueries();
            } else {
              Object.keys(val).forEach((layerName) => {
                const diffKeys = getDiffKeys(val[layerName], oldVal[layerName]);

                if (diffKeys.length) {
                  mapLayers.updateLayerQuery(layerName, undefined, diffKeys);
                }
              });
            }
          }, 50);
        },
      );
    });

    app.provide('mapLayers', mapLayers);
  },
};
