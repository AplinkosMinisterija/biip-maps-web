<template>
  <UiPopup>
    <template #action>
      <UiButtonIcon icon="download" />
    </template>

    <template #default>
      <div class="text-sm w-72 space-y-4 p-2">
        <h3 class="font-bold text-base">Eksportuoti vaizdą</h3>

        <div>
          <label class="block font-medium mb-1">Formatas</label>
          <UiButtonRow>
            <UiButton
              :variant="selectedFormat === 'jpg' ? 'primary' : 'outline'"
              @click="selectedFormat = 'jpg'"
              >JPG</UiButton
            >
            <UiButton
              :variant="selectedFormat === 'pdf' ? 'primary' : 'outline'"
              @click="selectedFormat = 'pdf'"
              >PDF</UiButton
            >
          </UiButtonRow>
        </div>

        <UiButton class="w-full mt-2" @click="startBoxSelection"> Žymėti sritį </UiButton>
      </div>
    </template>
  </UiPopup>

  <!-- Tempimo stačiakampis -->
  <div
    v-if="selecting"
    ref="box"
    class="absolute border-2 border-blue-500 bg-blue-200/30 pointer-events-none z-50"
    :style="boxStyle"
  ></div>
</template>

<script setup lang="ts">
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { computed, reactive, ref } from 'vue';

const selectedFormat = ref<'jpg' | 'pdf'>('jpg');
const selecting = ref(false);
const box = ref<HTMLElement | null>(null);

const boxData = reactive({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
});

const boxStyle = computed(() => {
  const left = Math.min(boxData.startX, boxData.endX);
  const top = Math.min(boxData.startY, boxData.endY);
  const width = Math.abs(boxData.endX - boxData.startX);
  const height = Math.abs(boxData.endY - boxData.startY);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

function startBoxSelection() {
  selecting.value = false;

  const onMouseDown = (e: MouseEvent) => {
    selecting.value = true;
    boxData.startX = e.clientX;
    boxData.startY = e.clientY;
    boxData.endX = e.clientX;
    boxData.endY = e.clientY;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    boxData.endX = e.clientX;
    boxData.endY = e.clientY;
  };

  const onMouseUp = async () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    selecting.value = false;

    // Eksportavimas
    const left = Math.min(boxData.startX, boxData.endX);
    const top = Math.min(boxData.startY, boxData.endY);
    const width = Math.abs(boxData.endX - boxData.startX);
    const height = Math.abs(boxData.endY - boxData.startY);

    const body = document.body;
    const canvas = await html2canvas(body, {
      useCORS: true,
      scale: 2,
      x: left,
      y: top,
      width,
      height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg');

    if (selectedFormat.value === 'jpg') {
      const link = document.createElement('a');
      link.href = imgData;
      link.download = 'zemelapis-iskarpa.jpg';
      link.click();
    } else {
      const pdf = new jsPDF({ orientation: width > height ? 'landscape' : 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      pdf.save('zemelapis-iskarpa.pdf');
    }
  };

  window.addEventListener('mousedown', onMouseDown, { once: true });
}
</script>

<style scoped></style>
