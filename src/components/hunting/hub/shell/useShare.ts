import { inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { HUB_SHELL } from './shell';

// "Dalintis": copies the link with the period explicit (§2.3), as the wolves page does.
export function useShare() {
  const ctx = inject(HUB_CTX)!;
  const shell = inject(HUB_SHELL, null);
  const eventBus: any = inject('eventBus', null);

  return async function share() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      const override = shell?.shareOverride.value;
      await navigator.clipboard.writeText(override ? override() : ctx.shareUrl());
      eventBus?.emit('uiToast', { type: 'success', title: S.shareDone });
    } catch (err) {
      eventBus?.emit('uiToast', { type: 'danger', title: S.shareFail });
    }
  };
}
