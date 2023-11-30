<template>
  <UiSidebar :title="title" :is-open="isOpen" @close="emit('close')">
    <UiAccordion>
      <component :is="componentByType" :features="features" />
    </UiAccordion>
  </UiSidebar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FeaturesAccordionDefault from "@/components/features/accordion/Default.vue";
import FeaturesAccordionRusys from "@/components/features/accordion/Rusys.vue";
import FeaturesAccordionUETK from "@/components/features/accordion/UETK.vue";
import FeaturesAccordionHunting from "@/components/features/accordion/Hunting.vue";
import FeaturesAccordionGamtotvarka from "@/components/features/accordion/Gamtotvarka.vue";
import FeaturesAccordionAnimals from "@/components/features/accordion/Animals.vue";
import FeaturesAccordionTourism from "@/components/features/accordion/Tourism.vue";
import FeaturesAccordionZvejyba from "@/components/features/accordion/Zvejyba.vue";
import FeaturesAccordionZuvinimas from "@/components/features/accordion/Zuvinimas.vue";

const emit = defineEmits(["close"]);

const props = defineProps({
  title: { type: String, default: "" },
  type: { type: String, default: "" },
  features: { type: Array, default: () => [] },
  isOpen: Boolean,
});

const componentByType = computed(() => {
  if (!props.type) return FeaturesAccordionDefault;
  else if (props.type === "rusys") return FeaturesAccordionRusys;
  else if (props.type === "uetk") return FeaturesAccordionUETK;
  else if (props.type === "hunting") return FeaturesAccordionHunting;
  else if (props.type === "gamtotvarka") return FeaturesAccordionGamtotvarka;
  else if (props.type === "animals") return FeaturesAccordionAnimals;
  else if (props.type === "tourism") return FeaturesAccordionTourism;
  else if (props.type === "zvejyba") return FeaturesAccordionZvejyba;
  else if (props.type === "zuvinimas") return FeaturesAccordionZuvinimas;
  return "pre";
});
const features = computed(() => props.features || []);

const title = computed(() => {
  const title = props.title || "Identifikuoti objektai";

  if (!features.value?.length) return title;
  return `${title} (${features.value.length})`;
});
</script>
