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
          background: '#EFEBE6',
          surface: '#FFFFFF',
          primary: '#8B9A8C',
          secondary: '#8FA0A8',
          info: '#8FA0A8',
          warning: '#BD8B6F',
          error: '#B06A56',
          success: '#8B9A8C',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
});
