import { ref } from 'vue';
import { loadWMSLayer } from '@/utils';

export interface GamtotvarkaMeasure {
  id: number;
  name: string;
}

// Priemonių sąrašas #3 filtrui. Klasifikatorius (priemones_id → pavadinimas)
// per WFS neeksponuojamas, todėl unikalias priemones surenkam iš pačių darbų
// sluoksnio. WFS neturi DISTINCT, tad pasiimam tik du laukus ir dedublikuojam
// kliento pusėje. Įrašai be priemones_id (nepriskirti klasifikatoriui) į sąrašą
// nepatenka.
const GAMTOTVARKA_WFS_URL = 'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka';
const WORKS_LAYER = 'tvarkymo_darbai';
const measuresUrl =
  `${GAMTOTVARKA_WFS_URL}?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature` +
  `&TYPENAME=${WORKS_LAYER}&PROPERTYNAME=priemones_id,priemone&OUTPUTFORMAT=application/json`;

interface WorksFeature {
  properties?: { priemones_id?: number | null; priemone?: string | null };
}

let cache: Promise<GamtotvarkaMeasure[]> | null = null;

function fetchMeasures(): Promise<GamtotvarkaMeasure[]> {
  return (loadWMSLayer(measuresUrl) as Promise<WorksFeature[]>).then((features) => {
    const byId = new Map<number, string>();
    features.forEach((feature) => {
      const id = feature?.properties?.priemones_id;
      const name = feature?.properties?.priemone;
      if (id === null || id === undefined || byId.has(id)) return;
      byId.set(id, name || String(id));
    });
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'lt'));
  });
}

export function useGamtotvarkaMeasures() {
  const measures = ref<GamtotvarkaMeasure[]>([]);
  const loading = ref(false);
  const error = ref(false);

  async function load() {
    if (measures.value.length || loading.value) return;
    loading.value = true;
    error.value = false;
    try {
      cache = cache || fetchMeasures();
      measures.value = await cache;
    } catch {
      cache = null;
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  return { measures, loading, error, load };
}
