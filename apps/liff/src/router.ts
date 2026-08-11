import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      // A string redirect target drops the current query string. LINE's OAuth
      // callback lands here at `/` with `code`/`state` (liff.init() needs them to
      // complete the login) — forward `to.query` so they survive the redirect to
      // /auth/login instead of vanishing before LoginPage.vue ever mounts.
      redirect: (to) => ({ path: '/auth/login', query: to.query }),
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
        {
          path: 'coupons',
          name: 'myCoupons',
          component: () => import('~/pages/coupons/index.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'coupons/:id',
          name: 'couponDetail',
          component: () => import('~/pages/coupons/[id].vue'),
          props: true,
          meta: { requiresAuth: true },
        },
        {
          path: 'member-card',
          name: 'memberCard',
          component: () => import('~/pages/member-card/index.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'points',
          name: 'points',
          component: () => import('~/pages/points/index.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'events/:id',
          name: 'eventDetail',
          component: () => import('~/pages/events/[id].vue'),
          props: true,
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
