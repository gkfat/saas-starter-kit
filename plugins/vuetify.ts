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
            primary: '#1967D2',
            surface: '#ffffff',
            background: '#ffffff',
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
