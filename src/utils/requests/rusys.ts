import { rusysApiHost } from '@/config';

export async function getItemsByRequest(id: number) {
  if (!id) return;

  return fetch(`${rusysApiHost}/maps/requests/${id}/items`).then((res) => res.json());
}
