import { rusysApiHost } from '@/config';

export async function getData(url: string) {
  return fetch(url).then((res) => res.json());
}

export async function getItemsByRequest(id: number) {
  if (!id) return;

  return getData(`${rusysApiHost}/maps/requests/${id}/items`);
}

export async function getGeomByRequest(id: number) {
  if (!id) return;

  return getData(`${rusysApiHost}/maps/requests/${id}/geom`);
}
