import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/auth/login',
    },
    {
      path: '/auth',
      component: () => import('~/layouts/AuthLayout.vue'),
      children: [
        { path: 'login', name: 'login', component: () => import('~/pages/auth/LoginPage.vue') },
        {
          path: 'register',
          name: 'register',
          component: () => import('~/pages/auth/RegisterPage.vue'),
        },
        {
          path: 'invite',
          name: 'invite',
          component: () => import('~/pages/auth/InvitePage.vue'),
        },
        { path: 'bind', name: 'bind', component: () => import('~/pages/auth/BindPage.vue') },
      ],
    },
    {
      path: '/',
      component: () => import('~/layouts/MemberLayout.vue'),
      children: [
        {
          path: 'home',
          name: 'home',
          component: () => import('~/pages/home/index.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'member-center',
          name: 'memberCenter',
          component: () => import('~/pages/member-center/index.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isLoggedIn) {
    return '/auth/login';
  }
});

export default router;
