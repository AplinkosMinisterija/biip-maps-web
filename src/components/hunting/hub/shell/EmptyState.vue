<template>
  <div class="flex flex-col items-start gap-2 rounded-md border border-line-strong bg-page p-3">
    <p class="text-sm text-ink">{{ empty.text }}</p>
    <div v-if="actions.length" class="flex flex-wrap gap-2">
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="rounded-md border border-line-strong bg-white px-3 text-sm font-semibold text-ink hover:bg-brand-50"
        :class="[focusRing, large ? 'min-h-[44px]' : 'min-h-[32px]']"
        @click="apply(action.sel)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { HubSelection, TopicView } from '@/utils/hunting/hub/types';
import { focusRing } from './shell';

const props = defineProps({
  empty: { type: Object as PropType<NonNullable<TopicView['empty']>>, required: true },
  large: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;

const actions = computed(() => props.empty.actions.filter((a): a is NonNullable<typeof a> => !!a));

// Shared by the empty state and map messages: apply a partial selection.
function apply(sel: Partial<HubSelection>) {
  if (sel.topic && sel.topic !== ctx.sel.value.topic) ctx.setTopic(sel.topic);
  if (sel.season !== undefined) ctx.setSeason(sel.season);
  if (sel.sav !== undefined) ctx.setSav(sel.sav);
  if (sel.table !== undefined) ctx.setTable(sel.table);
  if (sel.dims) Object.entries(sel.dims).forEach(([k, v]) => ctx.setDim(k, v));
}
</script>
