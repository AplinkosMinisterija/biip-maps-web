import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Fill, Stroke, Style } from 'ol/style';

const colorPalette = [
  'rgba(178,226,226,0.5)',
  'rgba(102,194,164,0.5)',
  'rgba(44,162,95,0.5)',
  'rgba(0,109,44,0.5)',
];

export const useStatsStore = defineStore('stats', () => {
  const stats = ref({} as any);

  function getStats(type: string) {
    return stats.value[type];
  }

  function getStyles(type: string, id: string | number) {
    const countField = 'count';
    const idField = 'code';

    const stats = getStats(type) || [];

    const maxValue = Math.max(...stats.map((item: any) => item[countField]));

    const matchingConfig = stats.find((s: any) => s[idField] == id);
    const count = matchingConfig?.[countField] || 0;

    let featureFillColor = 'rgba(237,248,251,0.5)';
    if (count) {
      const colorIndex = Math.round(
        (count / maxValue) * (colorPalette.length - 1),
      );
      featureFillColor = colorPalette[colorIndex];
    }

    const style = new Style({
      fill: new Fill({
        color: featureFillColor,
      }),
      stroke: new Stroke({
        color: 'rgba(15,15,15,0.3)',
        width: 1,
      }),
    });

    return {
      color: featureFillColor,
      style,
    };
  }

  return { getStats, getStyles };
});
