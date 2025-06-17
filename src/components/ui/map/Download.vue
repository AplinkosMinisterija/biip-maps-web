<template>
  <div>
    <!-- Download button -->
    <UiPopup style="min-height: fit-content">
      <template #action>
        <UiButtonIcon icon="download" />
      </template>
      <template #default="{ open }" style="min-height: fit-content">
        <div class="p-0 text-sm w-42 space-y-4">
          <h3 class="font-bold">Išsaugojimo nustatymai</h3>

          <div>
            <div class="font-medium mb-1">Puslapio dydis</div>
            <div class="grid grid-cols-3 gap-2">
              <UiButton
                v-for="size in pageSizes"
                :key="size"
                size="md"
                fontWeight="font-normal"
                :type="selectedSize === size ? 'default' : 'ghost'"
                :active="selectedSize === size"
                @click="() => (selectedSize = size)"
              >
                {{ size }}
              </UiButton>
            </div>
          </div>

          <div>
            <div class="font-medium mb-1">Puslapio orientacija</div>
            <div class="grid grid-cols-2 gap-2">
              <UiButton
                v-for="orientation in orientations"
                :key="orientation.value"
                :icon="orientation.icon"
                size="md"
                fontWeight="font-normal"
                :type="selectedOrientation === orientation.value ? 'default' : 'ghost'"
                :active="selectedOrientation === orientation.value"
                @click="() => (selectedOrientation = orientation.value)"
              >
                {{ orientation.label }}
              </UiButton>
            </div>
          </div>

          <div>
            <div class="font-medium mb-1">Formatas</div>
            <div class="grid grid-cols-3 gap-2">
              <UiButton
                v-for="format in formats"
                :key="format"
                size="md"
                fontWeight="font-normal"
                :type="selectedFormat === format ? 'default' : 'ghost'"
                :active="selectedFormat === format"
                @click="() => (selectedFormat = format)"
              >
                {{ format }}
              </UiButton>
            </div>
          </div>

          <div>
            <div class="font-medium mb-1">Taškų colyje (DPI)</div>
            <div class="grid grid-cols-3 gap-2">
              <UiButton
                v-for="dpi in dpis"
                :key="dpi"
                size="md"
                fontWeight="font-normal"
                :type="selectedDPI === dpi ? 'default' : 'ghost'"
                :active="selectedDPI === dpi"
                @click="() => (selectedDPI = dpi)"
              >
                {{ dpi }} DPI
              </UiButton>
            </div>
          </div>

          <UiButton
            class="w-full bg-gray-900 hover:bg-gray-800 text-white text-base py-3 px-4 flex justify-center items-center"
            centerText
            fontWeight="font-normal"
            @click="startSelection"
          >
            Generuoti
          </UiButton>
        </div>
      </template>
    </UiPopup>

    <div
      v-if="selecting"
      class="fixed inset-0 z-50 cursor-crosshair pointer-events-auto overflow-hidden"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    >
      <div
        v-if="selection"
        class="absolute bg-transparent z-50 border-2 border-white"
        :style="selectionStyle"
      ></div>

      <div class="fixed inset-0 z-40 pointer-events-none">
        <div
          class="absolute bg-black bg-opacity-60"
          :style="{ left: '0px', top: '0px', width: `${left}px`, height: '100vh' }"
        />
        <div
          class="absolute bg-black bg-opacity-60"
          :style="{ left: `${left}px`, top: '0px', width: `${width}px`, height: `${top}px` }"
        />
        <div
          class="absolute bg-black bg-opacity-60"
          :style="{
            left: `${left}px`,
            top: `${top + height}px`,
            width: `${width}px`,
            height: `calc(100vh - ${top + height}px)`,
          }"
        />
        <div
          class="absolute bg-black bg-opacity-60"
          :style="{
            left: `${left + width}px`,
            top: '0px',
            width: `calc(100vw - ${left + width}px)`,
            height: '100vh',
          }"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { computed, nextTick, ref } from 'vue';

const props = defineProps<{
  name: string;
}>();

const pageSizes = ['A4', 'A3', 'A2'];
const formats = ['PDF', 'JPG', 'SVG'];
const dpis = [72, 150, 300];
const orientations = [
  { label: 'Stačias', value: 'portrait', icon: 'portrait' },
  { label: 'Gulsčias', value: 'landscape', icon: 'landscape' },
];

const selectedSize = ref('');
const selectedFormat = ref('');
const selectedDPI = ref();
const selectedOrientation = ref('');

const selecting = ref(false);
const selection = ref<null | { startX: number; startY: number; endX: number; endY: number }>(null);

function startSelection() {
  selecting.value = true;
  selection.value = null;
}

function onMouseDown(e: MouseEvent) {
  selection.value = { startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
}

function onMouseMove(e: MouseEvent) {
  if (selection.value) {
    selection.value.endX = e.clientX;
    selection.value.endY = e.clientY;
  }
}

function onMouseUp() {
  if (selection.value) {
    nextTick(() => cropImage());
  }
  selecting.value = false;
}

const selectionStyle = computed(() => {
  if (!selection.value) return {};
  const { startX, startY, endX, endY } = selection.value;
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

const left = computed(() =>
  selection.value ? Math.min(selection.value.startX, selection.value.endX) : 0,
);
const top = computed(() =>
  selection.value ? Math.min(selection.value.startY, selection.value.endY) : 0,
);
const width = computed(() =>
  selection.value ? Math.abs(selection.value.endX - selection.value.startX) : 0,
);
const height = computed(() =>
  selection.value ? Math.abs(selection.value.endY - selection.value.startY) : 0,
);

function cropImage() {
  const { startX, startY, endX, endY } = selection.value!;
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  const dpiScale = selectedDPI.value / 96;

  html2canvas(document.body, { allowTaint: true, useCORS: true, scale: dpiScale }).then(
    (canvas) => {
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = width * dpiScale;
      croppedCanvas.height = height * dpiScale;
      const ctx = croppedCanvas.getContext('2d')!;
      ctx.drawImage(
        canvas,
        left * dpiScale,
        top * dpiScale,
        width * dpiScale,
        height * dpiScale,
        0,
        0,
        width * dpiScale,
        height * dpiScale,
      );

      const fileName = `${props.name}-${Date.now()}`;

      if (selectedFormat.value === 'SVG') {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${
          croppedCanvas.width
        }' height='${croppedCanvas.height}' viewBox='0 0 ${croppedCanvas.width} ${
          croppedCanvas.height
        }' preserveAspectRatio='xMinYMin meet'>
        <image href='${croppedCanvas.toDataURL('image/png')}' width='100%' height='100%'/>
      </svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.svg`;
        link.click();
        return;
      }

      if (selectedFormat.value === 'PDF') {
        const pdf = new jsPDF({
          orientation: selectedOrientation.value as 'portrait' | 'landscape',
          unit: 'pt',
          format: selectedSize.value as 'a4' | 'a3' | 'a2',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(croppedCanvas);
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        pdf.addImage(croppedCanvas, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`${fileName}.pdf`);
        return;
      }

      const mimeType = selectedFormat.value === 'JPG' ? 'image/jpeg' : 'image/png';
      croppedCanvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.${selectedFormat.value.toLowerCase()}`;
          link.click();
          URL.revokeObjectURL(url);
        },
        mimeType,
        1,
      );
    },
  );
}
</script>

<style scoped>
button:focus {
  outline: none;
}
</style>
