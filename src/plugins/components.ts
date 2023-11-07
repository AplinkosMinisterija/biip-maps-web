import _ from 'lodash';
import type { App } from 'vue';
import { defineAsyncComponent } from 'vue';

export default {
  install(app: App) {
    const mainPath = '../components/';
    const componentFiles = import.meta.glob('../components/**/*.vue');

    Object.entries(componentFiles).forEach(([path, importFn]: any[]) => {
      const componentName = _.upperFirst(
        _.camelCase(
          path
            .replace(mainPath, '')
            .replace('/Index.vue', '.vue')
            .split('/')
            .map((i: string) => _.upperFirst(i))
            .join()
            .replace(/\.\w+$/, ''),
        ),
      );

      app.component(`${componentName}`, defineAsyncComponent(importFn));
    });
  },
};
