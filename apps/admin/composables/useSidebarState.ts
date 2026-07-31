const STORAGE_KEY = 'sidebar-rail';

export function useSidebarState() {
  const rail = useState('sidebar-rail', () => {
    if (import.meta.client) {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  function toggle() {
    rail.value = !rail.value;
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(rail.value));
    }
  }

  return { rail, toggle };
}
