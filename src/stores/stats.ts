import { ref } from 'vue';
import { defineStore } from 'pinia';
import { gyvunaiApiHost, medziokleApiHost, zuvinimasApiHost, zvejybaApiHost } from '@/config';
import _ from 'lodash';
import { serializeQuery } from '@/utils';

const statsByType = {
  animals: {
    permits: {
      url: `${gyvunaiApiHost}/public/permits/all`,
      idProperty: 'municipality.id',
      countProperty: 'permitsCount',
    },
    fostered: {
      url: `${gyvunaiApiHost}/public/fosteredAnimals/all`,
      idProperty: 'municipality.id',
      countProperty: 'count',
    },
    aviaries: {
      url: `${gyvunaiApiHost}/public/aviaries/all`,
      idProperty: 'municipality.id',
      countProperty: 'aviariesCount',
    },
    species: {
      url: `${gyvunaiApiHost}/public/species/all`,
      idProperty: 'municipality.id',
      countProperty: 'count',
    },
  },
  zvejyba: {
    uetk: {
      url: `${zvejybaApiHost}/public/uetk/statistics`,
      idProperty: 'uetkCadastralId',
      countProperty: 'count',
      transformFn: (data: any) =>
        Object.keys(data).reduce(
          (acc: any, uetkCadastralId) => [
            ...acc,
            {
              ...data[uetkCadastralId],
              uetkCadastralId,
            },
          ],
          [],
        ),
    },
  },
  zuvinimas: {
    uetk: {
      url: `${zuvinimasApiHost}/public/uetk/statistics`,
      idProperty: 'uetkCadastralId',
      countProperty: 'count',
      transformFn: (data: any) =>
        Object.keys(data).reduce(
          (acc: any, uetkCadastralId) => [
            ...acc,
            {
              ...data[uetkCadastralId],
              uetkCadastralId,
            },
          ],
          [],
        ),
    },
  },
  medziokle: {
    loots: {
      url: `${medziokleApiHost}/lootsByMunicipality/stats`,
      transformFn: (data: any) =>
        Object.keys(data).reduce(
          (acc: any, municipalityId) => [
            ...acc,
            {
              ...data[municipalityId],
              municipalityId,
            },
          ],
          [],
        ),
      idProperty: 'municipalityId',
      countProperty: 'count',
    },
    limits: {
      url: `${medziokleApiHost}/limitsByMunicipality/stats`,
      transformFn: (data: any) =>
        Object.keys(data).reduce(
          (acc: any, municipalityId) => [
            ...acc,
            {
              ...data[municipalityId],
              municipalityId,
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
  const statsById = ref({} as any);
  const maxValueByType = ref({} as any);

  function getStats(type: string) {
    return _.get(stats.value, type);
  }

  function preloadStats(types: string | string[]) {
    if (!Array.isArray(types)) {
      types = [types];
    }
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

    let query = '';
    if (options.query) {
      query = `?${serializeQuery(options.query)}`;
    }

    const data = await fetch(`${options.url}${query}`)
      .then((data) => data.json())
      .then(transformFn)
      .then((data) =>
        data.map((r: any) => ({
          ...r,
          count: r[options.countProperty] || r.count,
        })),
      );

    _.set(stats.value, type, data);

    const byId = data?.reduce((acc: any, value: any) => {
      const id = _.get(value, options.idProperty);
      acc[id] = value;
      return acc;
    }, {});

    const maxValue = Math.max(...data.map((item: any) => item.count));

    _.set(statsById.value, type, byId);
    _.set(maxValueByType.value, type, maxValue);
  }

  function getStatsById(type: string, id: string | number) {
    const stats = _.get(statsById.value, type) || {};

    const matchingConfig = stats[id] || {};
    const maxValue = _.get(maxValueByType.value, type);

    return {
      maxValue,
      count: matchingConfig?.count || 0,
      properties: matchingConfig || {},
    };
  }

  async function setQuery(type: string, data: any) {
    const options = _.get(statsByType, type);
    options.query = data || {};
    await loadStats(type);
  }

  return { getStats, setQuery, loadStats, preloadStats, getStatsById };
});
