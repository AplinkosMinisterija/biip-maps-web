import { zvejybaApiHost } from '@/config';

export async function getFishTypes() {
  return fetch(`${zvejybaApiHost}/api/public/fishTypes`).then((res) => res.json());
}
