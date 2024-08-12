import { inject, reactive, ref } from 'vue';

const callbacks: { [key: string]: Function[] } = reactive({});

export function useLayersToggle() {
  const allLayers = ref([] as any);
  const mapLayers: any = inject('mapLayers');

  function getVisibleSublayersCount(layer: any) {
    if (!layer?.sublayers) return 0;

    return layer.sublayers
      ?.map((s: any) => {
        if (!!s.parent && !s.layer) {
          return isVisible(s.parent, s.value);
        }
        return isVisible(s);
      })
      .filter((i: boolean) => !!i).length;
  }

  function setVisible(layer: any, value: boolean = false, sublayerName: string = ''): void {
    let sublayer;
    if (sublayerName) {
      sublayer = layer?.sublayers?.find((sublayer: any) => sublayer.value === sublayerName);
    }

    const visibleSublayersCount = getVisibleSublayersCount(layer);

    if (visibleSublayersCount <= 1 && !value && sublayer) {
      return setVisible(layer, value);
    }

    if (typeof sublayer?.setVisible === 'function') {
      sublayer.setVisible(sublayer, value);
      triggerCallbacks('change', layer, value);
      return;
    }
    if (layer?.layer && !sublayerName) {
      layer.layer.setVisible(value);
      triggerCallbacks('change', layer, value);
      return;
    }

    const currentSublayers = layer.sublayers
      .filter((s: any) => !s.virtual)
      .map((s: any) => s.value)
      .filter((name: string) => {
        if (name === sublayerName) return value;
        return isVisible(layer, name);
      })
      .join(',');

    mapLayers.setSublayers(layer.id, currentSublayers);
    triggerCallbacks('change', layer, value, currentSublayers);
  }

  function isVisible(layer: any, sublayerName: string = '') {
    let sublayer;
    if (sublayerName) {
      sublayer = layer?.sublayers?.find((sublayer: any) => sublayer.value === sublayerName);
    }

    if (typeof sublayer?.isVisible === 'function') {
      return sublayer?.isVisible(sublayer);
    } else if (layer?.layer && !sublayerName) {
      return mapLayers.isVisible(layer.id);
    }

    return mapLayers.getSublayers(layer.id).includes(sublayerName);
  }

  function setLayers(layers: any[] = []) {
    allLayers.value = layers;
  }

  function on(type: string, callback: Function) {
    callbacks[type] = callbacks[type] || [];
    callbacks[type].push(callback);
  }

  function triggerCallbacks(type: string, ...args: any[]) {
    callbacks[type]?.forEach((cb) => {
      cb(...args);
    });
  }

  function mapSublayers(layer: any) {
    if (!layer.sublayers?.length) return [];

    function mapSublayer(item: any, parent?: any) {
      if (typeof item === 'string') {
        item = {
          name: item,
          value: item,
        };
      }

      if (item.layer) {
        if (!item.id) throw new Error('No layer ID provided');

        const sublayer = mapLayers.get(item.id);
        if (sublayer?.sublayers?.length) {
          item.sublayers = sublayer.sublayers;
        }
      }

      item.parent = parent;

      if (item.sublayers) {
        item.sublayers = item.sublayers.map((l: any) => mapSublayer(l, item));
      }

      return item;
    }

    return layer.sublayers.map((l: any) => mapSublayer(l, layer));
  }

  function toggleVisibility(layer: any, sublayerName: string = '') {
    const value = !isVisible(layer, sublayerName);
    setVisible(layer, value, sublayerName);

    return isVisible(layer, sublayerName);
  }

  return { setLayers, isVisible, setVisible, on, mapSublayers, toggleVisibility };
}
