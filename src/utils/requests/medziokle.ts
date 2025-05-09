import { medziokleApiHost } from '@/config';

export async function getMpvBbox(query: any) {
  return fetch(
    `${medziokleApiHost}/huntingAreas/bbox?${new URLSearchParams(query).toString()}`,
  ).then((res) => res.json());
}

