import { defineStore } from 'pinia';
import type { AuthUser } from '@saas-starter-kit/shared';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
  },

  actions: {
    setSession(user: AuthUser) {
      this.user = user;
    },

    clearSession() {
      this.user = null;
    },
  },
});
