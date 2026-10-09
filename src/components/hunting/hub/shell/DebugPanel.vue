<template>
  <section
    aria-labelledby="hub-debug-title"
    class="rounded-lg border border-dashed border-gray-400 bg-gray-50 p-3 font-mono text-xs text-gray-800"
  >
    <h2 id="hub-debug-title" class="mb-2 font-sans font-semibold text-gray-900">Derinimas</h2>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <template v-for="row in rows" :key="row[0]">
        <dt class="text-gray-600">{{ row[0] }}</dt>
        <dd class="break-words tabular-nums">{{ row[1] }}</dd>
      </template>
    </dl>
    <h3 class="mb-1 mt-3 font-sans font-semibold text-gray-900">
      Savitikra ({{ failed }} {{ failed === 1 ? 'klaida' : 'klaidų' }} iš {{ checks.length }})
    </h3>
    <p v-if="!available" class="text-gray-600">Savitikros modulio nėra.</p>
    <ul>
      <li v-for="check in checks" :key="check.name" :class="check.ok ? '' : 'text-red-800'">
        {{ check.ok ? 'OK' : 'KLAIDA' }}: {{ check.name
        }}<template v-if="!check.ok && check.detail"> – {{ check.detail }}</template>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, shallowRef, watch } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { SelfCheckResult } from '@/utils/hunting/selfcheck';
import type { SnapshotData } from '@/utils/hunting/hub/types';

// ?debug=1 (§13 T2): runs the core self-checks on the loaded snapshot. The module is loaded
// on demand, so the checks never reach the normal bundle path.
const ctx = inject(HUB_CTX)!;

type SelfCheckModule = {
  runHubSelfChecks?: (data?: SnapshotData | null) => SelfCheckResult[];
};
const loaders = import.meta.glob('@/utils/hunting/hub/selfcheck.ts');
const loader = Object.values(loaders)[0] as (() => Promise<SelfCheckModule>) | undefined;
const available = !!loader;

const checks = shallowRef<SelfCheckResult[]>([]);
const failed = computed(() => checks.value.filter((c) => !c.ok).length);

watch(
  () => ctx.data.snapshot.value,
  async (data) => {
    if (!loader) return;
    try {
      const mod = await loader();
      checks.value = mod.runHubSelfChecks?.(data) || [];
    } catch (err) {
      checks.value = [{ name: 'Savitikra', ok: false, detail: String(err) }];
    }
  },
  { immediate: true },
);

const rows = computed(() => {
  const meta = ctx.data.snapshot.value?.meta;
  const sel = ctx.sel.value;
  return [
    ['Tema', sel.topic],
    ['Sezonas', `${sel.season}`],
    ['Savivaldybė', sel.sav === null ? '–' : `${sel.sav}`],
    ['Matmenys', JSON.stringify(sel.dims)],
    ['Lentelė', sel.table || '–'],
    ['Būsena', ctx.data.phase.value],
    ['Kopija', meta?.snapshotDate || '–'],
    ['Šiandien', ctx.today],
  ];
});
</script>
