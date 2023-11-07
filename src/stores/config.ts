import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
export const useConfigStore = defineStore('config', () => {
  const srisData = ref({
    token: '',
    isPrivate: false,
    user: {} as any,
  });

  const setSrisToken = (token: string) => {
    srisData.value.token = token;
    srisData.value.isPrivate = !!token;
  };

  const setRusysUser = (user: { [key: string]: any }) => {
    srisData.value.user = user;
  };

  const srisHeaders = computed(() => {
    if (!srisData.value.token || !srisData.value.isPrivate) return;
    return { 'X-Maps-Auth': srisData.value.token || '' };
  });

  return {
    setSrisToken,
    setRusysUser,
    srisHeaders,
    user: {
      isExpert: computed(() => !!srisData.value?.user?.isExpert),
      isAdmin: computed(() => srisData.value?.user?.type === 'ADMIN'),
      isUser: computed(() => srisData.value?.user?.type === 'USER'),
    },
    hasToken: computed(() => !!srisData.value.token),
    srisShowAllPlaces: computed({
      get: () => !srisData.value.isPrivate,
      set: (value) => (srisData.value.isPrivate = !value),
    }),
  };
});
