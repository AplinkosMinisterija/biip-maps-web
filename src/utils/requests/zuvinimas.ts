import { zuvinimasApiHost } from '@/config';

export async function getFishTypes() {
  return fetch(`${zuvinimasApiHost}/public/fishTypes`).then((res) => res.json());
}
