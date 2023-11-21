import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Fill, Stroke, Style } from 'ol/style';
import { gyvunaiApiHost } from '@/config';
import _ from 'lodash';

const colorPalette = [
  'rgba(178,226,226,0.5)',
  'rgba(102,194,164,0.5)',
  'rgba(44,162,95,0.5)',
  'rgba(0,109,44,0.5)',
];

const defaultFeatureFillColor = 'rgba(237,248,251,0.5)';
const defaultStrokeColor = 'rgba(15,15,15,0.3)';

const statsByType = {
  animals: {
    permits: {
      url: `${gyvunaiApiHost}/api/public/permits/all`,
      idProperty: 'municipality.id',
      countProperty: 'permitsCount',
    },
    fostered: {
      url: `${gyvunaiApiHost}/api/public/fosteredAnimals/all`,
      idProperty: 'municipality.id',
      countProperty: 'count',
    },
    aviaries: {
      url: `${gyvunaiApiHost}/api/public/aviaries/all`,
      idProperty: 'municipality.id',
      countProperty: 'aviariesCount',
    },
    species: {
      url: `${gyvunaiApiHost}/api/public/species/all`,
      idProperty: 'municipality.id',
      countProperty: 'count',
    },
  },
};

export const useStatsStore = defineStore('stats', () => {
  const stats = ref({} as any);

  function getStats(type: string) {
    return _.get(stats.value, type);
  }

  function preloadStats(types: string[]) {
    return Promise.all(types.map((t) => loadStatsIfNeeded(t)));
  }

  async function loadStatsIfNeeded(type: string) {
    if (!getStats(type)) {
      await loadStats(type);
    }

    return getStats(type);
  }

  async function loadStats(type: string) {
    const options = _.get(statsByType, type);
    if (!options) return;

    const transformFn =
      options.transformFn ||
      function (data: any) {
        return data;
      };

    const data = await fetch(options.url)
      .then((data) => data.json())
      .then(transformFn)
      .then((data) =>
        data.map((r: any) => ({
          ...r,
          count: r[options.countProperty] || r.count,
        })),
      );

    _.set(stats.value, type, data);
  }

  function getStyles(type: string, id: string | number) {
    const options = _.get(statsByType, type);

    if (!options) return {};

    const stats = getStats(type) || [];

    const maxValue = Math.max(...stats.map((item: any) => item.count));

    const matchingConfig = stats.find(
      (s: any) => _.get(s, options.idProperty) == id,
    );
    const count = matchingConfig?.count || 0;

    let featureFillColor = defaultFeatureFillColor;
    if (count) {
      const colorIndex = Math.round(
        (count / maxValue) * (colorPalette.length - 1),
      );
      featureFillColor = colorPalette[colorIndex];
    }

    const style = new Style({
      fill: new Fill({
        color: featureFillColor,
      }),
      stroke: new Stroke({
        color: defaultStrokeColor,
        width: 1,
      }),
    });

    return {
      color: featureFillColor,
      style,
      stats: matchingConfig,
    };
  }

  return { getStats, getStyles, loadStats, preloadStats };
});
