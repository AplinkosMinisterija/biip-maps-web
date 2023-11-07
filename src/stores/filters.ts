import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

export const useFiltersStore = defineStore('filters', () => {
  const active = ref('');
  const search = ref('');

  function toggle(value: string = '', force: boolean = false) {
    if (active.value === value && !force) {
      active.value = '';
      return;
    }

    active.value = value;
  }

  function isActive(value: string) {
    return active.value === value;
  }

  function hide(value?: string) {
    if (value && value !== active.value) return;
    active.value = '';
  }

  function open(value: string) {
    active.value = value;
  }

  watch(search, (value) => {
    if (value?.length) {
      open('search');
    } else if (isActive('search')) {
      hide('search');
    }
  });

  function clearSearch() {
    search.value = '';
    hide('search');
  }

  return { active, toggle, search, clearSearch, isActive, hide, open };
});
