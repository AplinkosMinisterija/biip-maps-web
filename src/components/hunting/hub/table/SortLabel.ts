import { defineComponent, h, type PropType } from 'vue';
import { SORT_ICON, SORT_ICON_IDLE, SORT_ICON_ON, SORT_LABEL_ON, sortIcon } from './spec';

// A sortable header's label with its arrow in one inline run, so the arrow stays next to the
// words when the label wraps: before a numeric column's label (its right edge meets the
// digits), after a text column's label (VISUAL-13). A render function, because the template
// formatters would put a breakable space between the arrow and the words.
export default defineComponent({
  name: 'SortLabel',
  props: {
    label: { type: String, required: true },
    dir: { type: String as PropType<'asc' | 'desc' | null>, default: null },
    numeric: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      const icon = h('span', {
        'aria-hidden': 'true',
        class: [
          SORT_ICON,
          props.numeric ? 'mr-1' : 'ml-1',
          props.dir ? SORT_ICON_ON : SORT_ICON_IDLE,
        ],
        textContent: sortIcon(props.dir),
      });
      // The arrow and its neighbouring word never part.
      const words = props.label.split(' ');
      const nowrap = (...children: unknown[]) =>
        h('span', { class: 'whitespace-nowrap' }, children as any[]);
      const parts = props.numeric
        ? [nowrap(icon, words[0]), words.length > 1 ? ` ${words.slice(1).join(' ')}` : '']
        : [
            words.length > 1 ? `${words.slice(0, -1).join(' ')} ` : '',
            nowrap(words[words.length - 1], icon),
          ];
      return h('span', { class: props.dir ? SORT_LABEL_ON : '' }, parts);
    };
  },
});
