import { smalsuolisApiHost } from '@/config';
import type { SearchOptions } from '@/types';
import { serializeQuery } from '.';

export function getClusterItemsUrl(id: number | string, options?: SearchOptions) {
  return `${smalsuolisApiHost}/tiles/events/cluster/${id}/items?${serializeQuery(options)}`;
}

export function getEventUrl(id: number | string, options?: SearchOptions) {
  return `${smalsuolisApiHost}/tiles/events/${id}?${serializeQuery(options)}`;
}

export function getAllAppsUrl() {
  return `${smalsuolisApiHost}/apps/all`;
}
