import { zvejybaApiHost } from '@/config';

export async function getFishTypes() {
  return fetch(`${zvejybaApiHost}/public/fishTypes`).then((res) => res.json());
}
