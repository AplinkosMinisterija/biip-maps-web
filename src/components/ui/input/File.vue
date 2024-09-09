<template>
  <div class="flex items-center justify-center w-full">
    <div
      ref="dropZoneRef"
      class="flex flex-col items-center justify-center w-full h-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
      @click="inputFileRef?.click?.()"
    >
      <div
        class="flex flex-col items-center gap-2 justify-center pt-5 pb-6 text-center p-3"
      >
        <UiIcon name="upload" />
        <p class="text-sm text-gray-600">
          <slot name="label" :files="files">
            <template v-if="isOverDropZone">
              <span class="font-semibold">Paleiskite čia</span>
            </template>
            <template v-else-if="!files.length">
              <span class="font-semibold">Įkelkite</span> arba užneškite failą čia
            </template>
            <template v-else>
              <p v-for="f in fileNames" :key="f">{{ f }}</p>
            </template>
          </slot>
        </p>
        <p
          v-if="description && !files.length && !isOverDropZone"
          class="text-xs text-gray-600"
        >
          {{ description }}
        </p>
      </div>
    </div>

    <input
      ref="inputFileRef"
      type="file"
      class="hidden"
      :accept="accept.join(',')"
      :multiple="multiple"
      @change="(event: any) => upload(event?.target?.files)"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { useDropZone } from "@vueuse/core";
import { EXTENTION_BY_FILE_FORMAT } from "@/utils";
const props = defineProps({
  description: { type: String, default: "" },
  accept: { type: Array, default: () => [] },
  multiple: { type: Boolean, default: false },
});
const dropZoneRef = ref<HTMLDivElement>();
const inputFileRef = ref<HTMLDivElement>();

const accept = computed(() => props.accept);

const emit = defineEmits(["upload"]);
const files = ref([] as any[]);

function upload(filesToUpload: File[] = []) {
  files.value = [...(filesToUpload || [])].filter((f) => {
    if (!accept.value.length) return true;
    if (!f.type) {
      const extention = f.name.split(".").pop();
      if (!extention) return false;

      return Object.values(EXTENTION_BY_FILE_FORMAT).includes(extention);
    }
    return accept.value.includes(f.type);
  });

  if (!props.multiple) {
    files.value = files.value.slice(0, 1);
  }

  if (!files.value.length) return;
  emit("upload", files.value);
}

const fileNames = computed(() => {
  if (!files.value?.length) return "";

  return files.value.map((f) => `${f.name} (${getFileSize(f.size)})`);
});

const fileSizeNamesDictionary: any = {
  B: "KB",
  KB: "MB",
  MB: "GB",
  GB: "TB",
};

function getFileSize(size: number, fileSizeName = "B"): string {
  if (size < 900) return `${size} ${fileSizeName}`;

  const newSize = Number((size / 1024).toFixed(1));
  return getFileSize(newSize, fileSizeNamesDictionary[fileSizeName]);
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: upload as any,
  dataTypes: accept as any,
});
</script>
