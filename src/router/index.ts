import { createRouter, createWebHistory } from 'vue-router';

import { kebabCase } from 'lodash';

const mainPath = '../routes/';
const RouteComponents = import.meta.glob('../routes/**/*.vue');

const routes = Object.entries(RouteComponents).map(([path, importFn]: any[]) => {
  const name = kebabCase(
    path
      .toLowerCase()
      .replace(mainPath, '')
      .replace('/index.vue', '.vue')
      .split('/')
      .join()
      .replace(/\.\w+$/, ''),
  );
  path = name.replace(/-/gi, '/');
  return {
    path: `/${path === 'index' ? '' : path}`,
    name,
    component: importFn,
  };
});

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...routes],
});

export default router;
