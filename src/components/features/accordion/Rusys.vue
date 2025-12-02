<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getValue(feature, ['species_name', 'Rūšies pavadinimas'])"
      :subtitle="getSubtitle(feature)"
      :description="getDescription(feature)"
      :badge="feature?._layerTitle"
    >
      <UiTable class="text-xs">
        <UiTableRow v-for="(r, key) in filteredRows(feature)" :key="key">
          <UiTableCell>{{ r.name }}</UiTableCell>
          <UiTableCell>
            <UiImages v-if="r.images" :images="r.fn(feature, ...(r.fnParams || []))"></UiImages>
            <div v-else-if="r.fn" v-html="r.fn(feature, ...(r.fnParams || [])) || ''"></div>
            <span
              v-else-if="r.link"
              class="border-b border-b-black hover:border-b-gray-700 hover:text-gray-700 cursor-pointer"
              @click="r.click(feature)"
            >
              {{ r.link }}
            </span>
            <template v-else>{{ feature[r.prop] || '' }}</template>
          </UiTableCell>
        </UiTableRow>
      </UiTable>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config';
import { SpeciesTypes } from '@/utils';
import moment from 'moment';
import { computed, inject } from 'vue';
const props = defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});
const config = useConfigStore();
const postMessage: any = inject('postMessage');

const radavietesFeatureIds = ['radavietes', 'radavietes_invazines', 'radavietes_svetimzemes'];
const stebejimaiFeatureId = [
  'stebejimai_interpretuojami',
  'stebejimai_tyrineta_nerasta_invazines',
  'stebejimai_tyrineta_nerasta_svetimzemes',
];

const getFeatureName = (feature: any) => {
  return feature.featureId.split('.')[0];
};
const getFeatureId = (feature: any) => {
  return feature.featureId.split('.')[1];
};

const getSubtitle = (feature: any) => {
  const latinName = getValue(feature, ['species_name_latin', 'Rūšies mokslinis pavadinimas']);
  const text = `<i>lot. ${latinName}</i>`;
  return text;
};

function isFeaturePlace(feature: any) {
  const featureName = getFeatureName(feature);

  return radavietesFeatureIds.includes(featureName);
}
function isFeatureForm(feature: any) {
  const featureName = getFeatureName(feature);

  return stebejimaiFeatureId.includes(featureName);
}

function getSpeciesType(feature: any) {
  return getValue(feature, ['Apsaugos grupė', 'species_type']);
}

function isEndangeredSpeciesType(feature: any) {
  return getSpeciesType(feature) === 'ENDANGERED';
}

function isInvasiveSpeciesType(feature: any) {
  return getSpeciesType(feature) === 'INVASIVE';
}

const getDescription = (feature: any) => {
  if (isFeaturePlace(feature)) {
    const text = `${feature?.['Radavietės kodas']}`;
    const type = getValue(feature, ['Apsaugos grupė', 'species_type'], SpeciesTypes);
    return `${text} (${type} radavietė)`;
  } else if (isFeatureForm(feature)) {
    if (isEndangeredSpeciesType(feature)) {
      return 'Radavietė (pavienis stebėjimas)';
    } else if (isInvasiveSpeciesType(feature)) {
      return 'Tyrinėta, bet nerasta (invazinė)';
    }
    return 'Tyrinėta, bet nerasta (svetimžemė)';
  }

  return;
};

const features = computed(() => props.features || []);

const getTextFromProps = (item: any, type: string) => {
  const props = item;
  if (!props) return '';

  const propsByType: any = {
    kingdom: {
      name: ['Karalystė', 'kingdom_name'],
      latin: [
        'Karalystės lotyniškas pavadinimas',
        'kingdom_name_latin',
        'Karalystės mokslinis pavadinimas',
      ],
    },
    class: {
      name: ['Klasė', 'class_name'],
      latin: ['Klasės lotyniškas pavadinimas', 'class_name_latin', 'Klasės mokslinis pavadinimas'],
    },
    phylum: {
      name: ['Tipas', 'phylum_name', 'Grupė'],
      latin: ['Tipo lotyniškas pavadinimas', 'phylum_name_latin', 'Grupės mokslinis pavadinimas'],
    },
  };

  const propByType = propsByType[type];

  if (!propByType || !propByType.name) return '';

  return `${getValue(props, propByType.name)} (<i>lot. ${getValue(props, propByType.latin)}</i>)`;
};

const getDate = (item: any, props: string | string[]) => {
  if (!Array.isArray(props)) {
    props = [props];
  }
  const prop = props.find((p) => !!item[p]) || '';

  const date = item[prop] || '';
  if (!date) return '-';

  return moment(date).format('YYYY-MM-DD');
};

const getImages = (item: any, props: string | string[]) => {
  if (!Array.isArray(props)) {
    props = [props];
  }
  const prop = props.find((p) => !!item[p]) || '';

  const photos: any[] = item[prop] || [];

  if (!photos?.length) return [];

  return photos.map((p) => p.url);
};

const getValue = (item: any, props: string | string[], translates?: any) => {
  if (!Array.isArray(props)) {
    props = [props];
  }

  const prop = props.find((p) => !!item[p]);
  if (!prop) return '';

  const value = item[prop];
  if (!value) return '';

  if (translates) {
    return translates[value] || '';
  }

  return value;
};

const getStatus = (item: any, prop: string) => {
  const status = item[prop] || '';
  if (!status) return '';

  const statuses: any = {
    STABLE: 'Stabili',
    INITIAL: 'Sukurta',
    DECREASED: 'Sumažėjus',
    INCREASED: 'Padidėjus',
    DISAPPEARED: 'Išnyko',
    DESTROYED: 'Sunakinta',
  };

  return statuses[status] || '-';
};

const checkFeatureId = (types: string | string[]) => {
  if (!Array.isArray(types)) {
    types = [types];
  }

  return (feature: any) => {
    return types.includes(getFeatureName(feature));
  };
};

const rows: any[] = [
  {
    name: 'Kodas',
    prop: 'Radavietės kodas',
    show: checkFeatureId(radavietesFeatureIds),
  },
  {
    name: 'Statusas',
    fn: getStatus,
    show: checkFeatureId(radavietesFeatureIds),
    fnParams: ['Radavietės statusas'],
  },
  { name: 'Karalystė', fn: getTextFromProps, fnParams: ['kingdom'] },
  { name: 'Tipas', fn: getTextFromProps, fnParams: ['phylum'] },
  { name: 'Klasė', fn: getTextFromProps, fnParams: ['class'] },
  {
    name: 'Pirmas stebėjimas',
    fn: getDate,
    fnParams: ['first_observed_at'],
    show: checkFeatureId(radavietesFeatureIds),
  },
  {
    name: 'Stebėjimo data',
    fn: getDate,
    fnParams: [['observed_at', 'Stebėjimo data']],
    show: checkFeatureId(stebejimaiFeatureId),
  },
  {
    name: 'Naujausias stebėjimas',
    show: checkFeatureId(radavietesFeatureIds),
    fn: getDate,
    fnParams: ['last_observed_at'],
  },
  {
    name: 'Centro koordinatės',
    prop: 'center_coordinates',
  },
  {
    name: 'Anketa',
    link: 'Peržiūrėti anketą',
    click: selectFeature,
    show: (feature: any) => (config.user.isAdmin || config.user.isExpert) && isFeatureForm(feature),
  },
  {
    name: 'Radavietė',
    link: 'Peržiūrėti radavietę',
    click: selectFeature,
    show: (feature: any) =>
      (config.user.isAdmin || config.user.isExpert) && isFeaturePlace(feature),
  },
  {
    name: 'Individų skaičius (gausumas)',
    fn: getValue,
    fnParams: ['Gausumas (vnt.)'],
    show: (feature: any) =>
      checkFeatureId(stebejimaiFeatureId)(feature) && isEndangeredSpeciesType(feature),
  },
  {
    name: 'Veiklos požymiai',
    fn: getValue,
    fnParams: ['activity_translate'],
    show: (feature: any) =>
      checkFeatureId([...stebejimaiFeatureId, ...radavietesFeatureIds]) &&
      isEndangeredSpeciesType(feature),
  },
  {
    name: 'Metodas',
    fn: getValue,
    fnParams: ['method_translate'],
    show: (feature: any) =>
      checkFeatureId(stebejimaiFeatureId)(feature) && !isEndangeredSpeciesType(feature),
  },
  {
    name: 'Vystymosi stadija',
    fn: getValue,
    fnParams: ['evolution_translate'],
    show: (feature: any) =>
      checkFeatureId([...stebejimaiFeatureId, ...radavietesFeatureIds]) &&
      isEndangeredSpeciesType(feature),
  },
  {
    name: 'Nuotraukos',
    images: true,
    fn: getImages,
    fnParams: ['photos'],
    show: checkFeatureId([...stebejimaiFeatureId, ...radavietesFeatureIds]),
  },
  {
    name: 'Šaltinis',
    fn: getValue,
    fnParams: ['source'],
    show: checkFeatureId(stebejimaiFeatureId),
  },
  {
    name: 'Buveinė, elgsena, ūkinė veikla ir kita informacija',
    fn: getValue,
    fnParams: ['Buveinės aprašymas'],
    show: checkFeatureId(stebejimaiFeatureId),
  },
  {
    name: 'Buveinė, elgsena, ūkinė veikla ir kita informacija',
    fn: getValue,
    fnParams: ['description'],
    show: checkFeatureId(radavietesFeatureIds),
  },
  {
    name: 'Stebėtojas',
    fn: getValue,
    fnParams: ['observed_by'],
    show: (feature: any) =>
      (config.user.isAdmin || config.user.isExpert) && checkFeatureId(stebejimaiFeatureId)(feature),
  },
  {
    name: 'Plotas',
    fn: (feature: any) => {
      const area = feature?.area;
      if (!area) return '-';

      return `${area} m2`;
    },
    show: checkFeatureId(radavietesFeatureIds),
  },
];

const filteredRows = (feature: any) => {
  return rows.filter((r) => {
    return !r.show || r.show(feature);
  });
};

function selectFeature(feature: any) {
  const id = getFeatureId(feature);

  if (isFeaturePlace(feature)) {
    postMessage('selectedPlace', id);
  } else if (isFeatureForm(feature)) {
    postMessage('selectedForm', id);
  }
}
</script>
