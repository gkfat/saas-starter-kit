import { defineStore } from 'pinia';
import type { LoginProvider } from '~/server/modules/auth/auth.types';
import { Role } from '~/shared/roles';

type AuthUser = {
  uid: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  providers: string[];
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
    isSuperadmin: (state) => state.user?.role === Role.SuperAdmin,
  },

  actions: {
    async setSession(idToken: string, provider: LoginProvider, phone?: string) {
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

    updateIdToken(idToken: string) {
      this.idToken = idToken;
    },

    clearSession() {
      this.user = null;
      this.idToken = null;
    },
  },
});
