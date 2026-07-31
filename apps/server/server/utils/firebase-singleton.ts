export function createFirebaseSingleton<TApp>(
  getApps: () => TApp[],
  createApp: () => TApp,
): () => TApp {
  let instance: TApp | null = null;
  return (): TApp => {
    if (instance !== null) return instance;
    const existing = getApps();
    if (existing.length > 0) {
      instance = existing[0];
      return instance;
    }
    instance = createApp();
    return instance;
  };
}
