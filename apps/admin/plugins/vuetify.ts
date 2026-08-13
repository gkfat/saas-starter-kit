import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: '#33495D',
            surface: '#ffffff',
            background: '#F3F4F6',
            'surface-variant': '#EEF0F3',
            border: '#E2E5EA',
            muted: '#6B7280',
            success: '#1F8A5B',
            warning: '#B7791F',
            error: '#C4392B',
            info: '#2563AB',
          },
        },
      },
    },
    icons: {
      defaultSet: 'mdi',
    },
  });
  app.vueApp.use(vuetify);
});
