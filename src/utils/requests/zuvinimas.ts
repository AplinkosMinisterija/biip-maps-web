import { zuvinimasApiHost } from '@/config';

export async function getFishTypes() {
  return fetch(`${zuvinimasApiHost}/api/public/fishTypes`).then((res) =>
    res.json(),
  );
}
