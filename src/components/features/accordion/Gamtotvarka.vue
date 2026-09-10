<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getTitleHtml(feature)"
      @click="selectFeature(feature)"
    >
      <UiTable class="text-xs">
        <UiTableRow v-for="item in getSorted(feature)" :key="item.id">
          <UiTableCell class="w-1/2">
            {{ item.name }}
          </UiTableCell>
          <UiTableCell class="w-1/2">
            {{ item.value }}
          </UiTableCell>
        </UiTableRow>
      </UiTable>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { isInteger } from 'lodash';
import { inject, onUnmounted } from 'vue';

defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

const mapLayers: any = inject('mapLayers');
const HIGHLIGHT_LAYER = 'gamtotvarkaHighlightLayer';

const translates: any = {
  tvarkymo_darbai: 'Atlikti tvarkymo darbai',
};

// Spalvų paletė kvadratėliams sąraše — spalva nustatoma pagal sluoksnį
// (deterministiškai), kad skirtingų sluoksnių įrašai vizualiai skirtųsi (#6).
const palette = ['#2e7d32', '#1565c0', '#6a1b9a', '#c62828', '#ef6c00', '#00838f'];

function colorFor(feature: any) {
  const key = String(feature._layerTitle || feature.featureId?.split('.')?.[0] || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

function getTitle(feature: any) {
  const objectType = translates[feature.featureId?.split('.')?.[0]];
  return objectType || feature._layerTitle || '';
}

function getTitleHtml(feature: any) {
  const color = colorFor(feature);
  const square = `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${color};margin-right:6px;vertical-align:middle;border:1px solid rgba(0,0,0,0.2)"></span>`;
  return `${square}${getTitle(feature)}`;
}

// #6: pasirinkus įrašą — paryškinam būtent to ploto ribas atskirame sluoksnyje
// ryškia spalva ir trumpai sumirksim, kad būtų aišku, kuris persidengiantis
// plotas šiuo metu peržiūrimas. Veikia ir telefone (tap = click).
let blinkTimer: any;

function selectFeature(feature: any) {
  if (!mapLayers || !feature?._geometry) return;

  mapLayers.highlightFeatures(feature._geometry, { layer: HIGHLIGHT_LAYER });

  const layer = mapLayers.getVectorLayer(HIGHLIGHT_LAYER);
  if (!layer) return;

  clearInterval(blinkTimer);
  let count = 0;
  layer.setVisible(true);
  blinkTimer = setInterval(() => {
    count++;
    layer.setVisible(count % 2 === 0);
    if (count >= 5) {
      clearInterval(blinkTimer);
      layer.setVisible(true);
    }
  }, 180);
}

onUnmounted(() => clearInterval(blinkTimer));

const getSorted = (properties: any) => {
  return Object.entries(properties)
    .reduce((acc: any, [key, value]) => {
      let id: number | string = parseInt(key.split('.')[0]);
      if (isNaN(id)) id = key;
      return [...acc, { name: key, value, id }];
    }, [])
    .sort((a: any, b: any) => {
      if (isInteger(a.id)) return a.id - b.id;
      return a.id.localeCompare(b.id);
    })
    .filter((item: any) => !['featureId', '_layerTitle', '_geometry'].includes(item.name));
};
</script>
