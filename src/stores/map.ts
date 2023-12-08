import { ref } from 'vue';
import { defineStore } from 'pinia';
import { MapLayers } from '@/utils';
export const useMapsStore = defineStore('maps', () => {
  const mapLayers = ref(new MapLayers());

  return { mapLayers };
});
