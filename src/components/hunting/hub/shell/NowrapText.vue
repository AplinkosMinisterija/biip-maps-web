<script lang="ts">
import { defineComponent, h } from 'vue';

// Text whose dates ("2026-10-09") and seasons ("2025/2026") never break at the hyphen or
// slash when the line wraps (OVERVIEW-24). The characters stay ASCII, so copy-paste keeps
// them. A render function, so no template whitespace reaches the text.
const KEEP = /\d{4}-\d{2}-\d{2}|\d{4}\/\d{4}/g;

export function nowrapParts(text: string): { text: string; keep: boolean }[] {
  const out: { text: string; keep: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(KEEP)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), keep: false });
    out.push({ text: match[0], keep: true });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), keep: false });
  return out;
}

export default defineComponent({
  name: 'NowrapText',
  props: {
    text: { type: String, default: '' },
  },
  setup(props) {
    return () =>
      nowrapParts(props.text).map((part) =>
        part.keep ? h('span', { class: 'whitespace-nowrap' }, part.text) : part.text,
      );
  },
});
</script>
