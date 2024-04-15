import { alisApiHost } from '@/config';

export function getWaterBodyInfoUrl(id?: number) {
  if (!id) return `${alisApiHost}/public/v1/cl/vandensTelkiniai`;
  return `${alisApiHost}/public/v1/cl/vandensTelkiniai?kodas=${id}`;
}
