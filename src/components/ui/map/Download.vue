<template>
  <div>
    <UiPopup :show="showPopup" style="min-height: fit-content">
      <template #action>
        <UiButtonIcon icon="download" />
      </template>
      <template #default="{ close }" style="min-height: fit-content">
        <div class="p-0 text-sm max-w-[250px] space-y-4">
          <h3 class="font-bold">Išsaugojimo nustatymai</h3>

          <div class="text-xs text-gray-700">
            Apibrėžkite teritoriją, kurią norite išsaugoti pasirinktu formatu.
          </div>

          <UiButton
            v-if="!selection || !!selecting"
            icon="selectArea"
            type="blue"
            size="mdNoPadding"
            fontWeight="font-normal"
            @click="startSelection"
          >
            Apibrėžkite teritoriją
          </UiButton>
          <div class="grid grid-cols-1" v-else>
            <UiButton
              icon="trashCan"
              type="blue"
              size="mdNoPadding"
              fontWeight="font-normal"
              @click="clearSelectionValue"
              iconRight
            >
              {{ selectionSize }}
            </UiButton>
          </div>

          <div>
            <div class="font-medium">Formatas</div>
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
            @click="
              () => {
                generateFile();
                close();
              }
            "
            :disabled="!canGenerate"
          >
            Generuoti
          </UiButton>
        </div>
      </template>
    </UiPopup>

    <div
      v-if="selecting || selection"
      class="fixed inset-0 z-50 cursor-crosshair pointer-events-auto overflow-hidden"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    >
      <div
        v-if="selection"
        class="absolute z-50 border-2 border-red-500 no-export"
        :style="selectionStyle"
      >
        <div
          class="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 no-export"
        >
          {{ selectionSize }}
        </div>
      </div>

      <div class="fixed inset-0 z-40 pointer-events-none">
        <div
          class="absolute"
          :style="{ left: '0px', top: '0px', width: `${left}px`, height: '100vh' }"
        />
        <div
          class="absolute"
          :style="{ left: `${left}px`, top: '0px', width: `${width}px`, height: `${top}px` }"
        />
        <div
          class="absolute"
          :style="{
            left: `${left}px`,
            top: `${top + height}px`,
            width: `${width}px`,
            height: `calc(100vh - ${top + height}px)`,
          }"
        />
        <div
          class="absolute"
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
import { computed, ref } from 'vue';

const props = defineProps<{ name: string }>();

const formats = ['PDF', 'JPG', 'SVG'];
const dpis = [72, 150, 300];
const selectedFormat = ref('');
const showPopup = ref<boolean | null>(null);
const selectedDPI = ref<number | null>(null);
const selecting = ref(false);
const selection = ref<null | { startX: number; startY: number; endX: number; endY: number }>(null);

function startSelection() {
  showPopup.value = true;
  selecting.value = true;
}

function clearSelectionValue() {
  selection.value = null;
}

function onMouseDown(e: MouseEvent) {
  if (!selecting.value) return;
  selection.value = { startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
}

function onMouseMove(e: MouseEvent) {
  if (selecting.value && selection.value) {
    selection.value.endX = e.clientX;
    selection.value.endY = e.clientY;
  }
}

function onMouseUp() {
  if (selecting.value && selection.value) {
    selecting.value = false;
  }
}

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

const selectionStyle = computed(() => ({
  left: `${left.value}px`,
  top: `${top.value}px`,
  width: `${width.value}px`,
  height: `${height.value}px`,
}));

const selectionSize = computed(() => `${width.value}px × ${height.value}px`);

const canGenerate = computed(() => {
  return (
    selection.value !== null &&
    width.value > 0 &&
    height.value > 0 &&
    selectedFormat.value !== '' &&
    selectedDPI.value !== null
  );
});

function generateFile() {
  if (!canGenerate.value) return;
  cropImage();
  selection.value = null;
  showPopup.value = null;
}

function cropImage() {
  const { startX, startY, endX, endY } = selection.value!;
  const leftPx = Math.min(startX, endX);
  const topPx = Math.min(startY, endY);
  const widthPx = Math.abs(endX - startX);
  const heightPx = Math.abs(endY - startY);

  const dpiScale = selectedDPI.value! / 96;

  html2canvas(document.body, {
    allowTaint: true,
    useCORS: true,
    scale: dpiScale,
    ignoreElements: (element) => element.classList.contains('no-export'),
  }).then((canvas) => {
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = widthPx * dpiScale;
    croppedCanvas.height = heightPx * dpiScale;
    const ctx = croppedCanvas.getContext('2d')!;
    ctx.drawImage(
      canvas,
      leftPx * dpiScale,
      topPx * dpiScale,
      widthPx * dpiScale,
      heightPx * dpiScale,
      0,
      0,
      widthPx * dpiScale,
      heightPx * dpiScale,
    );

    const fileName = `${props.name}-${Date.now()}`;

    if (selectedFormat.value === 'SVG') {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${croppedCanvas.width}' height='${
        croppedCanvas.height
      }' viewBox='0 0 ${croppedCanvas.width} ${
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
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
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
  });
}
</script>

<style scoped>
button:focus {
  outline: none;
}
</style>
