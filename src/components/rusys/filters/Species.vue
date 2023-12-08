<template>
  <div>
    <UiLabel size="sm">Rūšys</UiLabel>
    <UiSelect
      v-model="species"
      label="Rūšis"
      placeholder="Ieškoti"
      :close-on-select="false"
      mode="tags"
      :limit="10000"
      value-prop="id"
      track-by="id"
      :searchable="true"
      label-prop="name"
      :options="loadOptions"
      :search-filter="searchFilter"
      :infinite="true"
    />
  </div>
</template>

<script lang="ts" setup>
import { searchRusys, searchInObject } from '@/utils';
import { useConfigStore } from '@/stores/config';
import { computed, ref } from 'vue';

const config = useConfigStore();
const speciesTypes = ref(['INVASIVE', 'ENDANGERED', 'INTRODUCED']);
const props = defineProps({
  value: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['change']);

const species = computed({
  get: () => props.value || [],
  set: (value) => {
    emit('change', value);
  },
});

async function loadOptions(query: string) {
  const data = await searchRusys(query || '', {
    query: {
      speciesType: {
        $in: speciesTypes.value.filter((item) => {
          if (item !== 'INTRODUCED') return true;
          return !!(config.user.isExpert || config.user.isAdmin);
        }),
      },
    },
    pageSize: 10000,
  }).then((d) => d.rows);
  return data;
}

function searchFilter(option: any, query: string) {
  const { found } = searchInObject(query, option, ['name', 'nameLatin']);
  return found;
}
</script>
