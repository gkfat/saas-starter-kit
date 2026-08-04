import { defineStore } from 'pinia';

/**
 * Holds the LINE ID Token + profile hints between LoginPage (which discovers there's no
 * matching account) and RegisterPage (where the user picks a username to complete
 * quick-register). SPA in-memory navigation only — never persisted, never sent anywhere
 * except back to /api/auth/line-register.
 */
export const useLineRegistrationStore = defineStore('lineRegistration', {
  state: () => ({
    idToken: null as string | null,
    displayName: null as string | null,
    email: null as string | null,
  }),

  actions: {
    setPending(data: { idToken: string; displayName: string | null; email: string | null }) {
      this.idToken = data.idToken;
      this.displayName = data.displayName;
      this.email = data.email;
    },

    clear() {
      this.idToken = null;
      this.displayName = null;
      this.email = null;
    },
  },
});
