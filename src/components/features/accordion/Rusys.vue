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
      <UiButton
        v-if="false && (config.user.isAdmin || config.user.isExpert)"
        class="mb-2"
        size="sm"
        @click="selectFeature(feature)"
      >
        Peržiūrėti pilnus duomenis
      </UiButton>
      <UiTable class="text-xs">
        <UiTableRow v-for="(r, key) in filteredRows(feature)" :key="key">
          <UiTableCell>{{ r.name }}</UiTableCell>
          <UiTableCell v-if="r.fn" v-html="r.fn(feature, ...(r.fnParams || [])) || ''" />
          <UiTableCell v-else>
            {{ feature[r.prop] || "" }}
          </UiTableCell>
        </UiTableRow>
      </UiTable>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { SpeciesTypes } from '@/utils';
import moment from 'moment';
import { useConfigStore } from "@/stores/config";
import { computed, inject } from 'vue';
const props = defineProps({
  features: {
    type: Array<any>,
    default: []
  },
});
const config = useConfigStore();
const postMessage: any = inject("postMessage");

const radavietesFeatureIds = ['radavietes', 'radavietes_invazines', 'radavietes_svetimzemes'];
const interpretuojamiStebejimaiFeatureId = 'stebejimai_interpretuojami';

const getFeatureName = (feature: any) => {
  return feature.featureId.split('.')[0];
};
const getFeatureId = (feature: any) => {
  return feature.featureId.split('.')[1];
};

const getSubtitle = (feature: any) => {
  const latinName = getValue(feature, ['species_name_latin','Rūšies mokslinis pavadinimas'])
  const text =`<i>lot. ${latinName}</i>`;
  return text;
}

function isFeaturePlace(feature: any) {
  const featureName = getFeatureName(feature);

  return radavietesFeatureIds.includes(featureName)
}
function isFeatureForm(feature: any) {
  const featureName = getFeatureName(feature);

  return [interpretuojamiStebejimaiFeatureId].includes(featureName)
}

const getDescription = (feature: any) => {
  if (isFeaturePlace(feature)) {
    const text = `${feature?.['Radavietės kodas']}`;
    const type = getValue(feature, ['Apsaugos grupė', 'species_type'], SpeciesTypes)
    return `${text} (${type} radavietė)`
  } else if (isFeatureForm(feature)) {
    return 'Radavietė (pavienis stebėjimas)';
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
      latin: ['Karalystės lotyniškas pavadinimas', 'kingdom_name_latin', 'Karalystės mokslinis pavadinimas'],
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

const getDate = (item: any, prop: string) => {
  const date = item[prop] || '';
  if (!date) return '-';

  return moment(date).format('YYYY-MM-DD');
};

const getValue = (item: any, props: string | string[], translates?: any) => {
  if (!Array.isArray(props)) {
    props = [props]
  }

  const prop = props.find(p => !!item[p])
  if (!prop) return ''

  const value = item[prop]
  if (!value) return ''

  if (translates) {
    return translates[value] || ''
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
  { name: 'Karalystė', fn: getTextFromProps, fnParams: ['kingdom',] },
  { name: 'Tipas', fn: getTextFromProps, fnParams: ['phylum'] },
  { name: 'Klasė', fn: getTextFromProps, fnParams: ['class'] },
  {
    name: 'Pirmas stebėjimas',
    fn: getDate,
    fnParams: ['Sukūrimo data'],
    show: checkFeatureId(radavietesFeatureIds),
  },
  {
    name: 'Stebėjimo data',
    fn: getDate,
    fnParams: ['observed_at'],
    show: checkFeatureId(interpretuojamiStebejimaiFeatureId),
  },
  {
    name: 'Naujausias stebėjimas',
    show: checkFeatureId(radavietesFeatureIds),
    fn: getDate,
    fnParams: ['Atnaujinimo data'],
  },
  {
    name: 'Sunaikinta / Išnykus',
    fn: getDate,
    fnParams: ['Ištrynimo data'],
    show: checkFeatureId(radavietesFeatureIds),
  },
  {
    name: 'Centro koordinatės',
    prop: 'center_coordinates',
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
    postMessage('selectedPlace', id)
  } else if (isFeatureForm(feature)) {
    postMessage('selectedForm', id)
  }
}
</script>
