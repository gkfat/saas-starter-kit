import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('~/pages/LoginPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('~/pages/RegisterPage.vue'),
    },
    {
      path: '/invite',
      name: 'invite',
      component: () => import('~/pages/InvitePage.vue'),
    },
    {
      path: '/bind',
      name: 'bind',
      component: () => import('~/pages/BindPage.vue'),
    },
  ],
});

export default router;
