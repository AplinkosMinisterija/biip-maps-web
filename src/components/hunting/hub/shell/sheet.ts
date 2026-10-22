import { inject, onBeforeUnmount, toRaw, watch, type Ref } from 'vue';

// Shared pieces of the three phone bottom sheets (the hub's MobileSheet, StebSheet and the
// wolves sheet): the handle's names and the map behind the full detent.

export type SheetDetent = 'peek' | 'half' | 'full';

// The handle says what a tap does next (peek → half → full → peek); aria-expanded says
// whether the sheet is open beyond the peek.
export const SHEET_HANDLE: Record<SheetDetent, string> = {
  peek: 'Rodyti daugiau',
  half: 'Išskleisti visą ekraną',
  full: 'Suskleisti',
};

// A sentence end: ". " before a capital letter, so "2026 m. spalio" and "9 d. būklei" stay.
const SENTENCE_END = /(?<=\.)\s+(?=[A-ZĄČĘĖĮŠŲŪŽ])/u;

/** The first sentence of an answer, for the two-line peek (no clamp ellipsis after a ".")
 *  when the answer has more than one. */
export const firstSentence = (text: string) => text.split(SENTENCE_END)[0];

/** "Sumedžiota" → "sumedžiota" after a number; a short form in capitals ("MPV …") stays. */
export function lowerFirst(label: string) {
  if (label.length > 1 && label[1] !== label[1].toLocaleLowerCase('lt')) return label;
  return label.charAt(0).toLocaleLowerCase('lt') + label.slice(1);
}

/**
 * While `covered` is true the sheet covers the whole map: make the map element inert, so
 * its controls (zoom, layers, …) leave the Tab order and cannot get focus behind the sheet
 * (WCAG 2.4.11). Only what this sheet set is undone, on change and on unmount.
 */
export function useMapInert(covered: Ref<boolean>) {
  const mapLayers: any = inject('mapLayers', null);
  let set: HTMLElement | null = null;
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
    release();
  });
}
