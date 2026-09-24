<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getTitleHtml(feature)"
      @click="selectFeature(feature)"
    >
      <UiTable class="text-xs table-fixed">
        <UiTableRow v-for="item in getRows(feature)" :key="item.id">
          <UiTableCell class="w-2/5 align-top font-medium">
            {{ item.name }}
          </UiTableCell>
          <UiTableCell class="w-3/5 align-top">
            <a
              v-if="item.href"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              class="border-b border-b-black hover:border-b-gray-700 hover:text-gray-700 break-all"
            >
              {{ item.value }}
            </a>
            <template v-else>{{ item.value }}</template>
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

type Row = { id: string; name: string; value: any; href?: string };
type FieldDef = { key: string; label: string; link?: boolean };

// VSTT 2026-09-24 patvirtintas laukų sąrašas (biip-gamtotvarka-public#72, 3 punktas).
// Tvarka – kliento, ne alfabetinė. Tuščios reikšmės slepiamos.
//
// SVARBU (patikrinta gyvai 2026-09-24 su yarn dev + Playwright prieš
// b9a6778e-1bcc-4725-a2d4-63075c90b7ea planą): VSTT QGIS Server GetFeatureInfo
// (WMS) grąžina JSON properties raktus kaip QGIS projekte sukonfigūruotus
// LAUKŲ ALIASUS (lietuviškus, su tarpais/diakritika), o ne žalius DB stulpelių
// pavadinimus – tie stulpelių pavadinimai matomi tik per WFS GetFeature (žr.
// useGamtotvarkaMeasures.ts). Todėl FieldDef.key čia yra tiksli alias eilutė,
// tokia, kokia atkeliauja per GetFeatureInfo – ne snake_case stulpelio vardas.
// Kelios reikšmės (biosferospoligonai, biosferosrezervatai, rezervatai,
// direkcija) aliaso neturi – ten key sutampa su žaliu stulpelio vardu.
const PLANAVIMAS_FIELDS: FieldDef[] = [
  { key: 'Tvarkymo dokumento pavadinimas', label: 'Tvarkymo teritorijos pavadinimas' },
  { key: 'BAST teritorija', label: 'BAST teritorija' },
  { key: 'BAST teritorijos kodas', label: 'BAST teritorijos kodas' },
  { key: 'PAST teritorija', label: 'PAST teritorija' },
  { key: 'PAST kodas', label: 'PAST teritorijos kodas' },
  { key: 'Draustinis', label: 'Draustinis' },
  { key: 'Parkas', label: 'Parkas' },
  { key: 'biosferospoligonai', label: 'Biosferos poligonas' },
  { key: 'biosferosrezervatai', label: 'Biosferos rezervatas' },
  { key: 'rezervatai', label: 'Rezervatas' },
  { key: 'Tvarkymo ploto numeris', label: 'Ploto numeris' },
  { key: 'Plotas (ha)', label: 'Plotas (ha)' },
  { key: 'Tvirtinimo dokumentas', label: 'Tvirtinimo dokumentas' },
  { key: 'Nuoroda į dokumentą', label: 'Nuoroda į dokumento failą', link: true },
  { key: 'Dokumento tipas', label: 'Dokumento tipas' },
  { key: 'Dokumento patvirtinimo data', label: 'Dokumento patvirtinimo/parengimo data' },
  { key: 'Dokumento statusas', label: 'Dokumento statusas' },
  { key: 'Tvarkymo priemonių aprašymai', label: 'Tvarkymo priemonių aprašymai' },
  { key: 'direkcija', label: 'Direkcija' },
];

const DARBAI_FIELDS: FieldDef[] = [
  { key: 'Tvarkymo teritorijos pavadinimas', label: 'Tvarkymo teritorijos pavadinimas' },
  { key: 'Priemonės pavadinimas', label: 'Priemonės pavadinimas' },
  { key: 'Darbų atlikimo data', label: 'Darbų atlikimo data' },
  { key: 'Tvarkymo dokumentas', label: 'Tvarkymo dokumentas' },
  { key: 'Tvarkymo ploto numeris', label: 'Tvarkymo ploto numeris' },
  { key: 'Sutvarkytas plotas (ha)', label: 'Sutvarkyta (ha)' },
];

function layerOf(feature: any): string {
  return String(feature?.featureId ?? '').split('.')[0];
}

// Gamtotvarkos sluoksniai atpažįstami pagal QGIS sluoksnio vardą featureId prefikse.
// Kiti (STVK: draustiniai, parkai, Natura 2000…) lieka su bendru atvaizdavimu.
function kindOf(feature: any): 'darbai' | 'planavimas' | null {
  const layer = layerOf(feature);
  if (layer === 'tvarkymo_darbai') return 'darbai';
  if (/_plotai_|_teritorijos_/.test(layer)) return 'planavimas';
  return null;
}

function isEmpty(value: any): boolean {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

// Reikšmė iš išorinio serviso – nuoroda leidžiama tik http(s), kad neįsileistume javascript:/data:.
function safeHref(value: any): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return /^https?:\/\//i.test(s) ? s : undefined;
}

function getRows(feature: any): Row[] {
  const kind = kindOf(feature);
  if (!kind) return getGenericRows(feature);
  const defs = kind === 'darbai' ? DARBAI_FIELDS : PLANAVIMAS_FIELDS;
  return defs
    .filter((d) => !isEmpty(feature[d.key]))
    .map((d) => ({
      id: d.key,
      name: d.label,
      value: feature[d.key],
      href: d.link ? safeHref(feature[d.key]) : undefined,
    }));
}

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

const getGenericRows = (properties: any) => {
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
