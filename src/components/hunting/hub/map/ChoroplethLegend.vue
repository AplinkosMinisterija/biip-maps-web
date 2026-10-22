<template>
  <section
    v-if="def && model"
    aria-label="Legenda"
    :class="
      phone
        ? open
          ? 'w-[min(320px,calc(100vw-88px))] max-h-[50vh] overflow-y-auto rounded-lg border border-line bg-white p-3 shadow-[0_1px_3px_rgba(18,25,38,0.12)]'
          : ''
        : 'w-[280px] rounded-lg bg-white p-3 shadow-[0_1px_3px_rgba(18,25,38,0.12)]'
    "
  >
    <!-- Phone, collapsed: one 44 px control with the swatch strip (DATAVIZ-01). -->
    <button
      v-if="phone && !open"
      type="button"
      class="flex min-h-[44px] items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-ink shadow-[0_1px_3px_rgba(18,25,38,0.12)]"
      :class="FOCUS_RING"
      :aria-expanded="false"
      :aria-controls="bodyId"
      :aria-label="`Legenda: ${title.metric}`"
      @click="open = true"
    >
      Legenda
      <span class="flex h-2.5 w-[70px] gap-px overflow-hidden rounded-sm" aria-hidden="true">
        <span
          v-for="item in model.classes"
          :key="item.key"
          class="flex-1"
          :style="{ background: item.fill }"
        />
      </span>
      <UiIcon name="chevron-up" :size="16" aria-hidden="true" />
    </button>

    <template v-else>
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <h2 class="text-[13px] font-semibold leading-[18px] text-ink">{{ title.metric }}</h2>
          <p v-if="open" class="text-xs leading-4 text-ink-muted">
            {{ title.context ? `${title.context} · ` : '' }}{{ S.legendFixedClasses }}
          </p>
        </div>
        <button
          type="button"
          class="-mr-1 -mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full text-ink hover:bg-brand-50"
          :class="[FOCUS_RING, phone ? 'h-11 w-11 -my-2' : 'h-6 w-6']"
          :aria-expanded="open"
          :aria-controls="bodyId"
          :aria-label="open ? 'Suskleisti legendą' : 'Išskleisti legendą'"
          @click="open = !open"
        >
          <UiIcon :name="open ? 'chevron-down' : 'chevron-up'" :size="16" aria-hidden="true" />
        </button>
      </div>

      <div :id="bodyId" class="mt-2">
        <!-- One scale: contiguous swatches with 1 px white joins. -->
        <div class="flex gap-px overflow-hidden rounded-sm" aria-hidden="true">
          <span
            v-for="item in model.classes"
            :key="item.key"
            class="h-3 flex-1"
            :style="{ background: item.fill }"
          />
        </div>
        <template v-if="open">
          <!-- Continuous metrics: the breaks under the joins; counts: a label per swatch. -->
          <div
            v-if="!model.counts"
            class="relative mt-1 h-4 text-[11px] leading-4 tabular-nums text-ink-muted"
            aria-hidden="true"
          >
            <span
              v-for="(join, i) in model.joins"
              :key="join"
              class="absolute top-0 -translate-x-1/2 whitespace-nowrap"
              :style="{ left: `${((i + 1) / model.classes.length) * 100}%` }"
            >
              {{ join }}
            </span>
          </div>
          <div
            v-else
            class="mt-1 flex text-[11px] leading-4 tabular-nums text-ink-muted"
            aria-hidden="true"
          >
            <span
              v-for="item in model.classes"
              :key="item.key"
              class="flex-1 whitespace-nowrap text-center"
            >
              {{ item.label }}
            </span>
          </div>
          <!-- Screen readers get every class as text. -->
          <ul class="sr-only">
            <li v-for="item in model.classes" :key="item.key">{{ item.label }}</li>
          </ul>

          <ul
            v-if="model.specials.length"
            class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-4 text-ink"
          >
            <li v-for="item in model.specials" :key="item.key" class="flex items-center gap-1.5">
              <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true" class="shrink-0">
                <defs v-if="item.fill === 'dotted'">
                  <pattern :id="dotId" width="4" height="4" patternUnits="userSpaceOnUse">
                    <rect width="4" height="4" :fill="CHOROPLETH_EMPTY_FILL" />
                    <circle cx="2" cy="2" r="0.9" :fill="DOT_FILL" />
                  </pattern>
                </defs>
                <defs v-if="item.fill === 'hatched'">
                  <pattern
                    :id="hatchId"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="4" height="4" :fill="CHOROPLETH_EMPTY_FILL" />
                    <line x1="0" y1="0" x2="0" y2="4" :stroke="HATCH_LINE" stroke-width="1.5" />
                  </pattern>
                </defs>
                <rect
                  x="0.5"
                  y="0.5"
                  width="11"
                  height="9"
                  :fill="
                    item.fill === 'hatched'
                      ? `url(#${hatchId})`
                      : item.fill === 'dotted'
                        ? `url(#${dotId})`
                        : item.fill
                  "
                  :stroke="CHOROPLETH_OUTLINE"
                  stroke-width="1"
                />
              </svg>
              {{ item.label }}
            </li>
          </ul>
          <p v-if="note" class="mt-2 text-xs leading-4 text-ink-muted">{{ note }}</p>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, ref, watch } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import {
  CHOROPLETH_EMPTY_FILL,
  CHOROPLETH_OUTLINE,
  DOT_FILL,
  HATCH_LINE,
  HUB_CHOROPLETH_CTX,
  legendModel,
} from '@/composables/hunting/hub/useChoropleth';
import { S } from '@/utils/hunting/hub/strings';
import { FOCUS_RING } from '../shell/controls';

// Legend of the hub choropleth (DATAVIZ-06): one horizontal binned scale. Title = the metric,
// then the season; the breaks sit under the joins (continuous) or a label under every swatch
// (counts); the fills outside the scale ("0", "Nėra MPV", …) on a row below. Every swatch has
// a text label; "Nėra MPV" is hatched and "Neskelbiama" dotted, never colour only.
// Desktop: a 280 px card, collapsed to title + swatches below 1280 px. Phones (`phone`): a
// 44 px "Legenda" control with the swatch strip that opens the full legend (DATAVIZ-01).
const props = defineProps({
  phone: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const choropleth = inject(HUB_CHOROPLETH_CTX)!;

const uid = getCurrentInstance()?.uid ?? 0;
const bodyId = `hub-legend-body-${uid}`;
const hatchId = `hub-legend-hatch-${uid}`;
const dotId = `hub-legend-dots-${uid}`;
const def = computed(() => choropleth.def.value);
const codes = computed(() =>
  (ctx.data.snapshot.value?.meta.municipalities || []).map((m) => m.code),
);
const model = computed(() => (def.value ? legendModel(def.value, codes.value) : null));

// "Sumedžiota per 1 000 ha MPV ploto · 2025/2026" → the metric, then the rest.
const title = computed(() => {
  const [metric, ...rest] = (def.value?.legendTitle || '').split(' · ');
  return { metric, context: rest.join(' · ') };
});
// The fixed-classes sentence is already in the context line.
const note = computed(() => {
  const text = def.value?.note || '';
  return text.replace(S.legendFixedClasses, '').trim();
});

const open = ref(props.phone ? false : ctx.isWide.value);
watch(
  () => ctx.isWide.value,
  (wide) => {
    if (!props.phone) open.value = wide;
  },
);
// Phones: a topic or season change folds the legend back to its strip.
watch(
  () => def.value?.legendTitle,
  () => {
    if (props.phone) open.value = false;
  },
);
</script>
