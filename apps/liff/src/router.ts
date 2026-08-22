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
          path: 'profile',
          name: 'profile',
          component: () => import('~/pages/profile/index.vue'),
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
        {
          path: 'booking',
          name: 'bookingServices',
          component: () => import('~/pages/booking/index.vue'),
          meta: { requiresAuth: true, featureFlag: 'booking' },
        },
        {
          path: 'booking/my',
          name: 'myBookings',
          component: () => import('~/pages/booking/my.vue'),
          meta: { requiresAuth: true, featureFlag: 'booking' },
        },
        {
          path: 'booking/:serviceId',
          name: 'bookingService',
          component: () => import('~/pages/booking/[serviceId].vue'),
          props: true,
          // backTo 讓 sheet 底部的「上一頁」明確導回指定的前一步，不依賴瀏覽器 history
          // ——重新整理或深連結進入時並不存在可 back() 的紀錄，history-based 返回會失效。
          meta: { requiresAuth: true, featureFlag: 'booking', backTo: 'bookingServices' },
        },
        {
          path: 'booking/:serviceId/provider',
          name: 'bookingProvider',
          component: () => import('~/pages/booking/[serviceId]/provider.vue'),
          props: true,
          meta: { requiresAuth: true, featureFlag: 'booking', backTo: 'bookingService' },
        },
        {
          path: 'booking/:serviceId/confirm',
          name: 'bookingConfirm',
          component: () => import('~/pages/booking/[serviceId]/confirm.vue'),
          props: true,
          meta: { requiresAuth: true, featureFlag: 'booking', backTo: 'bookingProvider' },
        },
        {
          path: 'booking/:serviceId/result',
          name: 'bookingResult',
          component: () => import('~/pages/booking/[serviceId]/result.vue'),
          props: true,
          // sheetClose 讓 MemberLayout 的 sheet 底部按鈕改顯示「關閉」而非「返回」
          // ——送出結果為預約流程終點，不應允許返回上一步重新操作。
          meta: { requiresAuth: true, featureFlag: 'booking', sheetClose: true },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isLoggedIn) {
    return '/auth/login';
  }
  if (to.meta.featureFlag === 'booking' && !import.meta.env.VITE_FEATURE_BOOKING_ENABLED) {
    return '/home';
  }
});

export default router;
