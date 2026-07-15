import { APP_ROUTES } from '~/config/app-routes';

export async function useGroupRedirect(groupLabel: string) {
  const { hasPermission } = usePermission();

  const group = APP_ROUTES.find((g) => g.label === groupLabel);
  const target = group?.items.find((item) => !item.permission || hasPermission(item.permission));

  if (target?.path) {
    await navigateTo(target.path, { replace: true });
  }

  return { hasAnyAccess: !!target };
}
