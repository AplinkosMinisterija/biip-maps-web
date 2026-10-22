<template>
  <!-- Phones (the Filtrai sheet): the tree itself, 48 px rows. -->
  <HuntingHubTopicsZalaZalaGroupTree
    v-if="large"
    :name="`${uid}-m`"
    large
    :model-value="grupe"
    @update:model-value="setGrupe"
  />
  <!-- Filter bar, every width: one dropdown chip "Gyvūnai: …" like Sezonas and Vieta (D2). -->
  <HuntingHubTopicsVilkaiChipPopover
    v-else
    :name="groupDim.label"
    :value="chipValue(labelOf(grupe))"
    :title="groupDim.label"
    :active="grupe !== 'visos'"
    :padded="false"
    shrinkable
    initial-focus="input:checked"
    panel-class="w-[22rem]"
  >
    <template #default="{ close }">
      <div
        @pointerdown="byPointer = true"
        @keydown.enter.prevent="close()"
        @change="onChange(close)"
      >
        <HuntingHubTopicsZalaZalaGroupTree
          :name="uid"
          :model-value="grupe"
          @update:model-value="setGrupe"
        />
      </div>
    </template>
  </HuntingHubTopicsVilkaiChipPopover>
</template>

<script setup lang="ts">
// Žala "Gyvūnai" filter (decision D2): one dimension, one control, one selected state. The
// chip opens the radio tree; a choice applies at once (a click also closes the popover,
// arrow keys keep it open, Enter and Esc close it). Writes `grupe` through the hub state;
// the URL values do not change.
import { getCurrentInstance, inject, computed, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { chipValue } from '@/utils/hunting/hub/strings';
import type { DamageGroup } from '@/utils/hunting/hub/types';
import {
  GROUP_LABELS,
  PRESET_LABELS,
  groupDim,
  grupeOf,
  type Grupe,
  type Preset,
} from '@/utils/hunting/hub/topics/zala';

defineProps({
  large: { type: Boolean, default: false }, // the phone Filtrai sheet
});

const ctx = inject(HUB_CTX)!;
const uid = `hub-zala-grupe-${getCurrentInstance()?.uid ?? 0}`;

const grupe = computed(() => grupeOf(ctx.sel.value));
const labelOf = (g: Grupe) =>
  g in PRESET_LABELS ? PRESET_LABELS[g as Preset] : GROUP_LABELS[g as DamageGroup];

function setGrupe(value: string) {
  if (value === grupe.value) return;
  ctx.setDim(groupDim.key, value === 'visos' ? null : value);
}

// A click on a row (a native radio `change`) closes the popover; arrow keys do not.
const byPointer = ref(false);
function onChange(close: () => void) {
  if (byPointer.value) close();
  byPointer.value = false;
}
</script>
