import { defineStore } from 'pinia';
import type { AuthUser } from '@saas-starter-kit/shared';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    idToken: null as string | null,
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
  },

  actions: {
    setSession(user: AuthUser, idToken: string) {
      this.user = user;
      this.idToken = idToken;
    },

    clearSession() {
      this.user = null;
      this.idToken = null;
    },
  },
});
