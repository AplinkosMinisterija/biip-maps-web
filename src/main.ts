import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import mitt from 'mitt';
import router from './router';
import GlobalComponents from './plugins/components';
import Map from './plugins/map';
import Events from './plugins/events';
import './style.css';
import * as Sentry from '@sentry/vue';
import Popper from 'vue3-popper';
import { OpenAPI as OpenAPIBoundaries } from './utils/boundaries';

const eventBus = mitt();

const app = createApp(App);

app.config.unwrapInjectedRef = true;

if (import.meta.env.VUE_APP_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VUE_APP_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(router),
      }),
    ],
    environment: import.meta.env.VUE_APP_ENVIRONMENT,
    release: import.meta.env.VUE_APP_VERSION,
    tracesSampleRate: 1,
  });
}

// Replace base depending on env variable
// https://github.com/hey-api/openapi-ts/issues/368#issuecomment-2051374787
OpenAPIBoundaries.BASE = import.meta.env.VUE_APP_BOUNDARIES_HOST || 'https://boundaries.biip.lt';

app
  .use(createPinia())
  .use(router)
  .use(GlobalComponents)
  .use(Map)
  .use(Events)
  .provide('eventBus', eventBus)
  .component('popper', Popper)
  .mount('#app');
