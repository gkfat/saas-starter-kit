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
            'surface-variant': '#E1E4E8',
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
