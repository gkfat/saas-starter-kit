import { defineStore } from 'pinia';

type AuthUser = {
  uid: string;
  email: string | null;
  tenantId: string;
  role: string;
  permissions: string[];
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    idToken: null as string | null,
    isReady: false,
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
    isSuperadmin: (state) => state.user?.role === 'superadmin',
  },

  actions: {
    async setSession(idToken: string, provider: 'email' | 'google' | 'phone', phone?: string) {
      const data = await $fetch<AuthUser>('/api/auth/login', {
        method: 'POST',
        body: { idToken, provider, phone },
      });
      this.user = data;
      this.idToken = idToken;
    },

    rehydrate(user: AuthUser, idToken: string) {
      this.user = user;
      this.idToken = idToken;
    },

    setReady() {
      this.isReady = true;
    },

    clearSession() {
      this.user = null;
      this.idToken = null;
    },
  },
});
