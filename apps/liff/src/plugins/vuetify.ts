import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#06C755',
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
