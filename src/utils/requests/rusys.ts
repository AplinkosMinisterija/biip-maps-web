import { rusysApiHost } from '@/config';

export async function getItemsByRequest(id: number) {
  if (!id) return;

  return fetch(`${rusysApiHost}/maps/requests/${id}/items`).then((res) => res.json());
}

export async function getOwnItems(headers: { [key: string]: string } = {}) {
  return fetch(`${rusysApiHost}/maps/access/own`, { headers }).then((res) => res.json());
}
