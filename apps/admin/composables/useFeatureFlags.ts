import type { FeatureFlag } from '@saas-starter-kit/shared';

export function useFeatureFlags() {
  const config = useRuntimeConfig();

  function isFeatureEnabled(flag: FeatureFlag): boolean {
    return config.public.featureFlags[flag];
  }

  return { isFeatureEnabled };
}
