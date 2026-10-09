import { computed } from 'vue';
import type { HubContext } from '@/composables/hunting/hub/context';

export interface DimChip {
  key: string;
  label: string;
  value: string;
  fallback: string;
  groups: { label: string; options: { value: string; label: string }[] }[];
}

// The active topic's dimensions (rusis / grupe / rodiklis) as select chips, options grouped
// by their `group` label in the order they come.
export function useDimChips(ctx: HubContext) {
  const chips = computed<DimChip[]>(() => {
    const data = ctx.data.snapshot.value;
    const topic = ctx.topic.value;
    if (!data || topic.kind !== 'snapshot') return [];
    const sel = ctx.sel.value;
    return topic.dims.flatMap((dim) => {
      let options: { value: string; label: string; group?: string }[] = [];
      try {
        options = dim.options(data, sel);
      } catch (err) {
        options = [];
      }
      if (options.length < 2) return [];
      const fallback = dim.default(sel, data.meta);
      const groups: DimChip['groups'] = [];
      for (const o of options) {
        const label = o.group || '';
        let g = groups[groups.length - 1];
        if (!g || g.label !== label) {
          g = { label, options: [] };
          groups.push(g);
        }
        g.options.push({ value: o.value, label: o.label });
      }
      const value = sel.dims[dim.key] || fallback;
      return [{ key: dim.key, label: dim.label, value, fallback, groups }];
    });
  });
  return chips;
}

// Number of dimensions set away from their default (the mobile "Filtrai (n)" chip).
export function useActiveDimCount(ctx: HubContext) {
  const chips = useDimChips(ctx);
  return computed(() => chips.value.filter((c) => c.value !== c.fallback).length);
}
