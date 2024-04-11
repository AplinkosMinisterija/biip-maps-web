import { zuvinimasApiHost } from '@/config';
import type { SearchOptions } from '@/types';
import { serializeQuery } from '.';

export async function getFishTypes() {
  return fetch(`${zuvinimasApiHost}/public/fishTypes`).then((res) => res.json());
}

export async function getFishTypesInfoByYear(options?: SearchOptions) {
  return fetch(`${zuvinimasApiHost}/public/uetk/statistics/byYear?${serializeQuery(options)}`).then(
    (res) => res.json(),
  );
}
