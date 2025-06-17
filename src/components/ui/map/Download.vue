<template>
  <div>
    <UiPopup>
      <template #action>
        <UiButtonIcon icon="download" />
      </template>
      <template #default="{ close }">
        <div class="p-4 text-sm w-64 space-y-4">
          <h3 class="font-bold">Išsaugojimo nustatymai</h3>

          <div>
            <div class="font-medium mb-1">Puslapio dydis</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="size in pageSizes"
                :key="size"
                :class="buttonClass(selectedSize === size)"
                @click="selectedSize = size"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <div>
            <div class="font-medium mb-1">Puslapio orientacija</div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="orientation in orientations"
                :key="orientation.value"
                :class="buttonClass(selectedOrientation === orientation.value)"
                @click="selectedOrientation = orientation.value"
              >
                {{ orientation.label }}
              </button>
            </div>
          </div>

          <div>
            <div class="font-medium mb-1">Formatas</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="format in formats"
                :key="format"
                :class="buttonClass(selectedFormat === format)"
                @click="selectedFormat = format"
              >
                {{ format }}
              </button>
            </div>
          </div>

          <div>
            <div class="font-medium mb-1">Taškų colyje (DPI)</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="dpi in dpis"
                :key="dpi"
                :class="buttonClass(selectedDPI === dpi)"
                @click="selectedDPI = dpi"
              >
                {{ dpi }} DPI
              </button>
            </div>
          </div>

          <UiButton
            class="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium"
            @click="startSelection"
          >
            Generuoti
          </UiButton>
        </div>
      </template>
    </UiPopup>

    <div
      v-if="selecting"
      class="fixed inset-0 z-50 cursor-crosshair"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    >
      <div
        v-if="selection"
        class="absolute border-2 border-blue-500 bg-transparent z-50"
        :style="selectionStyle"
      ></div>

      <div
        class="absolute inset-0 z-40"
        :style="{
          background: 'rgba(0,0,0,0.6)',
          maskImage: maskStyle.maskImage,
          WebkitMaskImage: maskStyle.maskImage,
          maskComposite: 'exclude',
          WebkitMaskComposite: 'destination-out',
        }"
      ></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import html2canvas from 'html2canvas';
import { computed, nextTick, ref } from 'vue';

const pageSizes = ['A4', 'A3', 'A2'];
const formats = ['PDF', 'JPG', 'SVG'];
const dpis = [72, 150, 300];
const orientations = [
  { label: 'Stačias', value: 'portrait' },
  { label: 'Gulsčias', value: 'landscape' },
];

const selectedSize = ref('A4');
const selectedFormat = ref('PDF');
const selectedDPI = ref(150);
const selectedOrientation = ref('portrait');

const selecting = ref(false);
const selection = ref<null | {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}>(null);

function buttonClass(active: boolean) {
  return [
    'text-sm px-3 py-1 border rounded transition',
    active
      ? 'bg-gray-800 text-white border-gray-800'
      : 'bg-white text-gray-800 border-gray-300 hover:border-gray-500',
  ];
}

function startSelection() {
  selecting.value = true;
  selection.value = null;
}

function onMouseDown(e: MouseEvent) {
  selection.value = {
    startX: e.clientX,
    startY: e.clientY,
    endX: e.clientX,
    endY: e.clientY,
  };
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

const maskStyle = computed(() => {
  if (!selection.value) return {};
  const { startX, startY, endX, endY } = selection.value;
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return {
    maskImage: `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)`,
    WebkitMaskImage: `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)`,
    maskPosition: `${left}px ${top}px`,
    WebkitMaskPosition: `${left}px ${top}px`,
    maskSize: `${width}px ${height}px`,
    WebkitMaskSize: `${width}px ${height}px`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  };
});

function cropImage() {
  const { startX, startY, endX, endY } = selection.value!;
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // Pašalinam overlay prieš screenshotą
  const overlays = document.querySelectorAll('[style*="mask"], .border-blue-500');
  overlays.forEach((el) => ((el as HTMLElement).style.display = 'none'));

  html2canvas(document.body, {
    allowTaint: true,
    useCORS: true,
  }).then((canvas) => {
    overlays.forEach((el) => ((el as HTMLElement).style.display = ''));

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const ctx = croppedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, left, top, width, height, 0, 0, width, height);

    if (selectedFormat.value === 'SVG') {
      alert('SVG eksporto nepalaiko html2canvas');
      return;
    }

    const mimeType = selectedFormat.value === 'JPG' ? 'image/jpeg' : 'image/png';
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `zemelapis-${Date.now()}.${selectedFormat.value.toLowerCase()}`;
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
