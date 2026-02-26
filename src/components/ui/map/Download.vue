<template>
  <div>
    <UiPopup
      :show="showPopup"
      style="min-height: fit-content"
      :class="{ 'transparent-ui': selecting }"
    >
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
    <teleport to="body">
      <div
        v-if="selecting || selection"
        class="fixed inset-0 z-50 cursor-crosshair overflow-hidden"
        :style="{ pointerEvents: selecting ? 'auto' : 'none' }"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
      >
        <!-- Red selection rectangle -->
        <div
          v-if="selection"
          class="absolute z-50 border-2 border-red-500 no-export pointer-events-none"
          :style="selectionStyle"
        >
          <div
            class="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 no-export"
          >
            {{ selectionSize }}
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script lang="ts" setup>
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import moment from 'moment';
import { computed, ref } from 'vue';

const props = defineProps<{ name: string }>();

const formats = ['PDF', 'JPG'];
const dpis = [72, 150, 300];
const selectedFormat = ref('');
const showPopup = ref<boolean | null>(null);
const selectedDPI = ref<number | null>(null);
const selecting = ref(false);
const selection = ref<null | { startX: number; startY: number; endX: number; endY: number }>(null);

function toggleTargetVisibility(visible: boolean) {
  const classList = ['leftTop', 'rightBottom', 'bottomLeft'];
  classList.forEach((cls) => {
    document.querySelectorAll(`.${cls}`).forEach((el) => {
      (el as HTMLElement).style.visibility = visible ? 'visible' : 'hidden';
    });
  });
}

function startSelection() {
  showPopup.value = true;
  selecting.value = true;
  toggleTargetVisibility(false);
}

function clearSelectionValue() {
  selection.value = null;
  showPopup.value = null;
  selecting.value = false;
  toggleTargetVisibility(true);
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
    toggleTargetVisibility(true);
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

  const canvasEl = document.querySelector('canvas') as HTMLCanvasElement;

  html2canvas(canvasEl, {
    allowTaint: true,
    useCORS: true,
    scale: dpiScale,
    ignoreElements: (element) => element.classList.contains('no-export'),
  }).then((canvas) => {
    const lineHeight = 20 * dpiScale;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = widthPx * dpiScale;
    croppedCanvas.height = heightPx * dpiScale + lineHeight;

    const ctx = croppedCanvas.getContext('2d')!;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, croppedCanvas.width, lineHeight);

    ctx.fillStyle = 'black';
    ctx.font = `${12 * dpiScale}px sans-serif`;
    ctx.textBaseline = 'middle';

    ctx.fillText(props.name, 8 * dpiScale, lineHeight / 2);

    const currentUrl = window.location.origin;
    const currentDate = moment().format('YYYY-MM-DD');
    const rightText = `Žemėlapis sukurtas ${currentUrl} svetainėje, ${currentDate}`;

    const textWidth = ctx.measureText(rightText).width;
    ctx.fillText(rightText, croppedCanvas.width - textWidth - 8 * dpiScale, lineHeight / 2);

    ctx.drawImage(
      canvas,
      leftPx * dpiScale,
      topPx * dpiScale,
      widthPx * dpiScale,
      heightPx * dpiScale,
      0,
      lineHeight,
      widthPx * dpiScale,
      heightPx * dpiScale,
    );
    const fileName = `${props.name}-${Date.now()}`;

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
