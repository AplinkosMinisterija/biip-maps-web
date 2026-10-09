<template>
  <section v-if="rows.length || pending" :aria-labelledby="headingId" class="flex flex-col gap-1">
    <h3 :id="headingId" class="text-xs font-semibold uppercase tracking-wide text-gray-600">
      {{ S.otherRowsHeading }}
    </h3>
    <p v-if="pending && !rows.length" role="status" class="text-xs text-gray-600">
      {{ S.loading }}
    </p>
    <ul class="flex flex-col gap-1">
      <li v-for="row in rows" :key="row.topic">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 min-h-[32px] max-md:min-h-[44px] rounded px-1 py-1 text-left text-sm text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          @click="ctx.setTopic(row.topic)"
        >
          <span>{{ row.text }}</span>
          <UiIcon name="chevron-right" :size="16" aria-hidden="true" class="shrink-0" />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S, TOPIC_ORDER } from '@/utils/hunting/hub/strings';
import type { OtherRow, SnapshotFile, TopicDef } from '@/utils/hunting/hub/types';

// "Kiti rodikliai čia" (SPEC2 §6.6): one row per other topic for the selected municipality,
// each a link that switches topic and keeps `sav` (the target topic picks its own default
// season). Data: the other topics' snapshot files, loaded on demand.
const props = defineProps({
  sav: { type: Number, required: true },
  // Topic registry (utils/hunting/hub/topics); rows come from each `TopicDef.otherRow`.
  topics: { type: Array as PropType<TopicDef[]>, default: () => [] },
});

const ctx = inject(HUB_CTX)!;
const headingId = computed(() => `hub-other-rows-${props.sav}`);

const others = computed(() =>
  props.topics
    .filter((t) => t.id !== ctx.sel.value.topic && t.id !== 'apzvalga' && !!t.otherRow)
    .sort((a, b) => TOPIC_ORDER.indexOf(a.id) - TOPIC_ORDER.indexOf(b.id)),
);

const rowFiles = (t: TopicDef): SnapshotFile[] => t.otherRowFiles ?? t.files;

const missingFiles = computed<SnapshotFile[]>(() => {
  const snapshot = ctx.data.snapshot.value;
  const files = new Set<SnapshotFile>();
  others.value.forEach((t) =>
    rowFiles(t).forEach((f) => {
      if (!snapshot || !(f in snapshot)) files.add(f);
    }),
  );
  return [...files];
});

const pending = ref(false);
watch(
  missingFiles,
  async (files) => {
    if (!files.length) return;
    pending.value = true;
    try {
      await ctx.data.ensure(files);
    } catch (err) {
      // the rows are optional (P0b): a topic whose file failed simply has no row
    } finally {
      pending.value = false;
    }
  },
  { immediate: true },
);

const rows = computed<OtherRow[]>(() => {
  const snapshot = ctx.data.snapshot.value;
  if (!snapshot) return [];
  const out: OtherRow[] = [];
  others.value.forEach((t) => {
    if (rowFiles(t).some((f) => !(f in snapshot))) return;
    try {
      const row = t.otherRow!(snapshot, props.sav);
      if (row) out.push(row);
    } catch (err) {
      // a broken row must not take the card down
    }
  });
  return out;
});
</script>
