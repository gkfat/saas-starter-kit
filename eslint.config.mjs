import prettierConfig from 'eslint-config-prettier';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt().append(prettierConfig, {
  rules: {
    'no-console': 'off',
    'vue/multi-word-component-names': 'off',
  },
});
