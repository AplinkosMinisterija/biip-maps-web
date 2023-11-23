import { ref } from 'vue';
import { defineStore } from 'pinia';
import { gyvunaiApiHost, medziokleApiHost } from '@/config';
import _ from 'lodash';

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
  medziokle: {
    loots: {
      url: `${medziokleApiHost}/api/lootsByMunicipality/stats`,
      transformFn: (data: any) =>
        Object.entries(data).reduce(
          (acc: any, [municipalityId, stats]: any) => [
            ...acc,
            {
              ...stats,
              municipalityId,
              count: stats.animals
                .map((a: any) => a.count)
                .reduce((acc: number, item: number) => acc + item, 0),
            },
          ],
          [],
        ),
      idProperty: 'municipalityId',
      countProperty: 'count',
    },
    limits: {
      url: `${medziokleApiHost}/api/limitsByMunicipality/stats`,
      transformFn: (data: any) =>
        Object.entries(data).reduce(
          (acc: any, [municipalityId, stats]: any) => [
            ...acc,
            {
              ...stats,
              municipalityId,
              count: stats.animals
                .map((a: any) => a.count)
                .reduce((acc: number, item: number) => acc + item, 0),
            },
          ],
          [],
        ),
      idProperty: 'municipalityId',
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

  function getStatsById(type: string, id: string | number) {
    const options = _.get(statsByType, type);

    if (!options) return {};

    const stats = getStats(type) || [];

    const maxValue = Math.max(...stats.map((item: any) => item.count));
    const matchingConfig = stats.find(
      (s: any) => _.get(s, options.idProperty) == id,
    );

    return {
      maxValue,
      count: matchingConfig?.count || 0,
      properties: matchingConfig || {},
    };
  }

  return { getStats, loadStats, preloadStats, getStatsById };
});
