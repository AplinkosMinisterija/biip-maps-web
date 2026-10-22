import { computed, inject, onBeforeUnmount, ref, toRaw, watch, type Ref } from 'vue';
import { HUB_MOBILE_PEEK } from '@/utils/hunting/hub/layout';

// Shared pieces of the three phone bottom sheets (the hub's MobileSheet, StebSheet and the
// wolves sheet): the handle's names, its drag, the map behind the full detent, and the
// modal state of the hub's dialogs and full-screen sheets.

export type SheetDetent = 'peek' | 'half' | 'full';

// The handle says what a tap does next (peek → half → full → peek); aria-expanded says
// whether the sheet is open beyond the peek.
export const SHEET_HANDLE: Record<SheetDetent, string> = {
  peek: 'Rodyti daugiau',
  half: 'Išskleisti visą ekraną',
  full: 'Suskleisti',
};

/** The next detent of a tap on the handle. */
export const nextDetent = (detent: SheetDetent): SheetDetent =>
  detent === 'peek' ? 'half' : detent === 'half' ? 'full' : 'peek';

// A sentence end: ". " before a capital letter, so "2026 m. spalio" and "9 d. būklei" stay;
// or before a number after a number or bracket ("… 3 935). 2025/2026 sezone …"), so
// "Utenos r. sav. 2026/2027 …" stays one sentence.
const SENTENCE_END = /(?<=\.)\s+(?=[A-ZĄČĘĖĮŠŲŪŽ])|(?<=[\d)%]\.)\s+(?=\d)/u;

/** The first sentence of an answer, for the two-line peek (no clamp ellipsis after a ".")
 *  when the answer has more than one. */
export const firstSentence = (text: string) => text.split(SENTENCE_END)[0];

/** "Sumedžiota" → "sumedžiota" after a number; a short form in capitals ("MPV …") stays. */
export function lowerFirst(label: string) {
  if (label.length > 1 && label[1] !== label[1].toLocaleLowerCase('lt')) return label;
  return label.charAt(0).toLocaleLowerCase('lt') + label.slice(1);
}

/**
 * The peek's second line (JOURNEYS-04, CONTENT-04): every line adds information. When the
 * first line (`peek`, the answer's first sentence) already states the headline number, the
 * answer's next sentence ("Daugiausia – Kėdainių r. sav. (92), …"), else the second number
 * ("3 935 patvirtinta įsakymu"); the headline itself only when the first line lacks it.
 */
export function peekSecondLine(
  answer: string,
  peek: string,
  kpis: { value: string; label: string; sub?: string }[],
): string {
  const kpiLine = (k: { value: string; label: string; sub?: string } | undefined, sub = true) =>
    k ? [`${k.value} ${lowerFirst(k.label)}`, sub ? k.sub : ''].filter(Boolean).join(' · ') : '';
  const first = kpis[0];
  if (!first) return '';
  if (!peek.includes(first.value)) return kpiLine(first);
  const rest = firstSentence(answer.slice(peek.length).trim());
  if (rest) return rest;
  const second = kpis[1];
  return second && !peek.includes(second.value) ? kpiLine(second, false) : '';
}

// ---- The map behind a sheet.

// How many sheets cover the whole map right now (the shell takes the map's own controls,
// its legend and the "Žemėlapio duomenys lentelėje" button out of the Tab order).
const coveredCount = ref(0);
/** A phone sheet covers the whole map (the full detent, a table over the map). */
export const mapCovered = computed(() => coveredCount.value > 0);

/**
 * While `covered` is true the sheet covers the whole map: make the map element inert, so
 * its controls (zoom, layers, …) leave the Tab order and cannot get focus behind the sheet
 * (WCAG 2.4.11), and report it through `mapCovered`, so the shell does the same for what
 * lies outside the map element (UiMap's control containers, the phone legend; MOBILE-02).
 * Only what this sheet set is undone, on change and on unmount.
 */
export function useMapInert(covered: Ref<boolean>) {
  const mapLayers: any = inject('mapLayers', null);
  let set: HTMLElement | null = null;
  let counted = false;
  const count = (on: boolean) => {
    if (on === counted) return;
    counted = on;
    coveredCount.value += on ? 1 : -1;
  };
  const release = () => {
    if (set) set.inert = false;
    set = null;
  };
  let unmounted = false;
  const apply = () => {
    const map = mapLayers?.map ? toRaw(mapLayers.map) : null;
    const el = map?.getTargetElement?.() as HTMLElement | undefined;
    if (!el) return false;
    if (!el.inert) {
      el.inert = true;
      set = el;
    }
    return true;
  };
  watch(
    covered,
    (on) => {
      count(on);
      if (!on) return release();
      // A link with `lentele` opens the sheet full before the map exists.
      if (!apply()) {
        Promise.resolve(mapLayers?.waitForLoaded).then(() => {
          if (!unmounted && covered.value) apply();
        });
      }
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    unmounted = true;
    count(false);
    release();
  });
}

// ---- Drag on the handle.

/**
 * Drag on a sheet's handle: the sheet follows the pointer between the peek and `max()`,
 * and on release `onEnd(height, startHeight)` picks the detent. `consumeClick()` is true
 * once for the click that ends a drag, so that click does not also cycle the detent.
 */
export function useSheetDrag(opts: {
  sheet: Ref<HTMLElement | null>;
  max: () => number;
  onEnd: (height: number, startHeight: number) => void;
}) {
  const dragging = ref(false);
  const dragHeight = ref<number | null>(null);
  let startY = 0;
  let startH = 0;
  let suppressClick = false;

  function onDragStart(event: PointerEvent) {
    if (!opts.sheet.value) return;
    startY = event.clientY;
    startH = opts.sheet.value.getBoundingClientRect().height;
    dragging.value = true;
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  }

  function removeDragListeners() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
  }
  onBeforeUnmount(removeDragListeners);

  function onDragMove(event: PointerEvent) {
    const dy = startY - event.clientY;
    if (Math.abs(dy) < 6 && dragHeight.value === null) return;
    dragHeight.value = Math.max(HUB_MOBILE_PEEK, Math.min(opts.max(), startH + dy));
  }

  function onDragEnd() {
    removeDragListeners();
    dragging.value = false;
    const h = dragHeight.value;
    dragHeight.value = null;
    if (h === null) return;
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 100);
    opts.onEnd(h, startH);
  }

  function consumeClick() {
    if (!suppressClick) return false;
    suppressClick = false;
    return true;
  }

  return { dragging, dragHeight, onDragStart, consumeClick };
}

/** The detent nearest to a dragged height: the peek, half the frame, or `full` px. */
export function nearestDetent(height: number, full: number): SheetDetent {
  const options: [SheetDetent, number][] = [
    ['peek', HUB_MOBILE_PEEK],
    ['half', window.innerHeight / 2],
    ['full', full],
  ];
  return options.reduce((a, b) => (Math.abs(b[1] - height) < Math.abs(a[1] - height) ? b : a))[0];
}

// ---- Modal state (D16).

// How many of the hub's modal dialogs and full-screen sheets are open. Embedded, the bridge
// tells the WP page (`modal` message), which dims and disables its own chrome meanwhile.
const modalCount = ref(0);
/** One of the hub's modal dialogs or full-screen sheets is open. */
export const modalOpen = computed(() => modalCount.value > 0);

/** Counts the dialog as open while `open` is true (and never after unmount). */
export function useModalState(open: Ref<boolean>) {
  let counted = false;
  const count = (on: boolean) => {
    if (on === counted) return;
    counted = on;
    modalCount.value += on ? 1 : -1;
  };
  watch(open, (on) => count(!!on), { immediate: true });
  onBeforeUnmount(() => count(false));
}
