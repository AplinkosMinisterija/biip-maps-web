<template>
  <!-- One radio group laid out as a tree (decision D2): Visi; Plėšrūnai → Vilkai, Lūšys,
       Rudieji lokiai; Kanopiniai, stumbrai, bebrai → Kanopiniai, Stumbrai, Bebrai. -->
  <fieldset ref="root" class="min-w-0" @keydown="onKeydown">
    <legend :class="large ? 'mb-2 text-base font-semibold text-ink' : 'sr-only'">
      {{ groupDim.label }}
    </legend>
    <div class="flex flex-col gap-0.5">
      <label
        v-for="node in NODES"
        :key="node.value"
        :class="[
          OPTION,
          large ? OPTION_TOUCH : '',
          node.child ? (large ? 'pl-10' : 'pl-9') : '',
          node.value === modelValue ? OPTION_SELECTED : '',
          node.help ? 'py-1.5' : '',
        ]"
      >
        <input
          type="radio"
          :name="name"
          :value="node.value"
          :checked="node.value === modelValue"
          :aria-describedby="node.help ? `${name}-${node.value}-help` : undefined"
          :class="[CHECK, large ? 'h-5 w-5' : '']"
          @change="emit('update:modelValue', node.value)"
        />
        <span class="flex min-w-0 flex-col">
          <span :class="node.child ? '' : 'font-semibold'">{{ node.label }}</span>
          <span
            v-if="node.help"
            :id="`${name}-${node.value}-help`"
            class="font-normal"
            :class="[HELP, large ? 'text-sm' : '']"
          >
            {{ node.help }}
          </span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
// Žala "Gyvūnai" filter content: the popover of the chip in the filter bar and the phone
// Filtrai sheet use the same tree. Writes nothing itself: the parent applies `grupe`.
import { ref } from 'vue';
import {
  CHECK,
  HELP,
  OPTION,
  OPTION_SELECTED,
  OPTION_TOUCH,
} from '@/components/hunting/hub/shell/controls';
import {
  GROUP_LABELS,
  PRESETS,
  PRESET_HELP,
  PRESET_LABELS,
  groupDim,
  type Grupe,
  type Preset,
} from '@/utils/hunting/hub/topics/zala';

const props = defineProps({
  modelValue: { type: String, required: true },
  // Radio group name (unique per instance).
  name: { type: String, required: true },
  // Phones: 48 px rows.
  large: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

interface Node {
  value: Grupe;
  label: string;
  help?: string;
  child: boolean;
}
const preset = (p: Preset): Node[] => [
  { value: p, label: PRESET_LABELS[p], help: PRESET_HELP[p], child: false },
  ...PRESETS[p].map((g) => ({ value: g, label: GROUP_LABELS[g], child: true })),
];
const NODES: Node[] = [
  { value: 'visos', label: PRESET_LABELS.visos, child: false },
  ...preset('plesrunai'),
  ...preset('augalai'),
];

// Arrow keys move through the whole tree and select at once; Home/End jump to the ends.
const root = ref<HTMLElement | null>(null);
function onKeydown(event: KeyboardEvent) {
  const i = NODES.findIndex((n) => n.value === props.modelValue);
  const last = NODES.length - 1;
  const next = {
    ArrowDown: i + 1 > last ? 0 : i + 1,
    ArrowRight: i + 1 > last ? 0 : i + 1,
    ArrowUp: i - 1 < 0 ? last : i - 1,
    ArrowLeft: i - 1 < 0 ? last : i - 1,
    Home: 0,
    End: last,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  const value = NODES[next].value;
  emit('update:modelValue', value);
  root.value?.querySelector<HTMLInputElement>(`input[value="${value}"]`)?.focus();
}
</script>
