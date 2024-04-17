import { zuvinimasApiHost } from '@/config';
import type { SearchOptions } from '@/types';
import { serializeQuery } from '.';

export async function getFishTypes() {
  return fetch(`${zuvinimasApiHost}/public/fishTypes`).then((res) => res.json());
}

export function getFishTypesInfoByYearUrl(options?: SearchOptions) {
  return `${zuvinimasApiHost}/public/uetk/statistics/byYear?${serializeQuery(options)}`;
}
