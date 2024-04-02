export async function getWaterBodyInfo(id: number) {
  if (!id) return;

  return fetch(`/proxy/alis/public/v1/cl/vandensTelkiniai?kodas=${id}`).then((res) => res.json());
}
