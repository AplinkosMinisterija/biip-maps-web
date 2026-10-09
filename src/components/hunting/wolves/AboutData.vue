<template>
  <UiModal ref="modal" title="Apie duomenis" size="sm" :show-close-btn="false">
    <div class="flex flex-col gap-4 text-sm text-gray-800">
      <section>
        <h4 class="font-semibold text-gray-900">Iš kur duomenys</h4>
        <p>
          Taškai – BIOMON duomenys (iki 2026-03-31) ir BIIP elektroninio medžioklės lapo įrašai (nuo
          2025/2026 sezono). Einamojo sezono skaitiklis ir limitas – iš BIIP.
        </p>
      </section>

      <section v-if="paperTotal > 0">
        <h4 class="font-semibold text-gray-900">Ko čia nėra</h4>
        <p>{{ paperText }}</p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900">Datos</h4>
        <p>
          Rodoma Lietuvos kalendorinė diena. BIOMON įrašuose yra tik data, todėl laikas nerodomas.
          Popieriniu medžioklės lapu pateikto vilko data – naudotojo nurodyta sumedžiojimo data.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900">Sezonai</h4>
        <p>
          Medžioklės sezonas – nuo balandžio 1 d. iki kovo 31 d.; vilkų medžioklė – nuo spalio 15 d.
          iki kovo 31 d. (baigiama anksčiau, jei išnaudojamas limitas). Įrašai už šio laikotarpio
          ribų įtraukiami ir pažymimi.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900">Vieta</h4>
        <p>
          Vieta žemėlapyje rodoma apytiksliai – 1 km tinklelio langelio centre. Į CSV failą
          koordinatės neįtraukiamos.
        </p>
      </section>

      <section v-if="badDates > 0">
        <h4 class="font-semibold text-gray-900">Klaidingos datos</h4>
        <p>
          {{ formatInt(badDates) }} {{ pluralLt(badDates, ['įrašas', 'įrašai', 'įrašų']) }} su
          neįtikima data (ankstesne nei 2017-04-01, vėlesne nei šiandien arba neatpažįstama)
          neįtraukti.
        </p>
      </section>

      <section v-if="duplicates > 0">
        <h4 class="font-semibold text-gray-900">Galimi pasikartojimai</h4>
        <p>
          Rasta {{ formatInt(duplicates) }} galimų pasikartojimų tarp BIOMON ir BIIP (ta pati diena,
          iki 2 km); jie neištrinti.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900">Limitai</h4>
        <p>
          Einamojo sezono limitas – iš BIIP. Ankstesnių sezonų limitai: {{ pastLimits }}. Oficialūs
          sezono skaičiai skelbiami am.lrv.lt ir gali skirtis nuo čia rodomo taškų skaičiaus.
          <a
            :href="AM_WOLVES_URL"
            target="_blank"
            rel="noopener"
            class="font-semibold text-blue-800 underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Sumedžioti vilkai – am.lrv.lt<span class="sr-only"> (atidaroma naujame lange)</span>
          </a>
        </p>
      </section>

      <section v-if="hasMunicipalities">
        <h4 class="font-semibold text-gray-900">Savivaldybė</h4>
        <p>Nustatyta pagal sumedžiojimo vietą; prie ribų galimas nedidelis netikslumas.</p>
      </section>

      <p v-if="ctx.data.fetchedAt.value" class="text-xs text-gray-600">
        Duomenys gauti {{ formatDateTime(ctx.data.fetchedAt.value) }}
      </p>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-4 py-3 rounded bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        @click="close"
      >
        Uždaryti
      </button>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { formatDateTime, formatInt, pluralLt } from '@/utils/hunting/dates';
import { AM_WOLVES_URL, WOLF_LIMITS } from '@/utils/hunting/labels';

const ctx = inject(WOLVES_CTX)!;
const modal = ref<any>(null);
let opener: HTMLElement | null = null;

const dataset = computed(() => ctx.data.dataset.value);

const paperTotal = computed(() => {
  const d = dataset.value;
  if (!d) return 0;
  return (
    Object.values(d.paperRowsBySeason).reduce((sum, n) => sum + n, 0) + d.paperRowsUnknownSeason
  );
});

const paperBySeason = computed(() =>
  Object.entries(dataset.value?.paperRowsBySeason || {})
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([s, n]) => `${s}/${Number(s) + 1}: ${formatInt(n)}`)
    .join(', '),
);

const paperText = computed(() => {
  const n = paperTotal.value;
  const bySeason = paperBySeason.value ? ` (${paperBySeason.value})` : '';
  return (
    `${formatInt(n)} ${pluralLt(n, ['įrašas', 'įrašai', 'įrašų'])} – popieriniais lapais po ` +
    `sezono pateiktos suvestinės${bySeason}. Jose nėra vietos ir tikrosios datos, viena eilutė ` +
    'gali reikšti kelis vilkus, todėl jie čia nerodomi ir neskaičiuojami. Oficialus sezono ' +
    'skaičius dėl to gali būti didesnis.'
  );
});

const badDates = computed(() => dataset.value?.excludedBadDate || 0);
const duplicates = computed(() => dataset.value?.possibleDuplicatePairs || 0);
const hasMunicipalities = computed(() =>
  (dataset.value?.records || []).some((r) => r.municipalityCode !== undefined),
);

const pastLimits = computed(() =>
  Object.keys(WOLF_LIMITS)
    .map(Number)
    .sort((a, b) => a - b)
    .map((s) => `${s}/${s + 1} – ${formatInt(WOLF_LIMITS[s])}`)
    .join(', '),
);

let dialogBox: HTMLElement | null = null;
let isOpen = false;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// aria-modal="true" promises that focus stays inside: Tab and Shift+Tab wrap around (§12.13).
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab' || !dialogBox) return;
  const items = Array.from(dialogBox.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey && (active === first || !dialogBox.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialogBox.contains(active))) {
    event.preventDefault();
    first.focus();
  }
};

// UiModal closes itself from its own close button and the backdrop without telling the
// parent; route both through close() so focus returns and the key listener is removed.
const onModalClose = () => close();

// UiModal has no dialog role and an icon-only close button without a name;
// patch its DOM after opening so the dialog is announced correctly.
const patchModal = () => {
  const root: HTMLElement | undefined = modal.value?.$el;
  const title = root?.querySelector('h3');
  const box = title?.closest('.relative.z-50') as HTMLElement | null;
  if (!title || !box) return;
  dialogBox = box;
  title.id = 'wolves-about-title';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', title.id);
  const closeButton = box.querySelector('button');
  closeButton?.setAttribute('aria-label', 'Uždaryti');
  closeButton?.addEventListener('click', onModalClose);
  const backdrop = box.previousElementSibling as HTMLElement | null;
  backdrop?.addEventListener('click', onModalClose);
  closeButton?.focus();
};

async function open() {
  if (isOpen) return;
  isOpen = true;
  const active = document.activeElement;
  opener = active instanceof HTMLElement ? active : null;
  modal.value?.open();
  document.addEventListener('keydown', onKeydown);
  await nextTick();
  patchModal();
}

function close() {
  if (!isOpen) return;
  isOpen = false;
  modal.value?.close();
  document.removeEventListener('keydown', onKeydown);
  dialogBox = null;
  const target = opener;
  opener = null;
  nextTick(() => target?.focus());
}

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

defineExpose({ open, close });
</script>
