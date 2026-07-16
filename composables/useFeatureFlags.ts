import type { FeatureFlag } from '~/shared/feature-flags';

export function useFeatureFlags() {
  const config = useRuntimeConfig();

  function isFeatureEnabled(flag: FeatureFlag): boolean {
    return config.public.featureFlags[flag];
  }

  return { isFeatureEnabled };
}
