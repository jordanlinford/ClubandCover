export function hasRole(user: { roles: string[] } | null | undefined, role: string): boolean {
  return user?.roles?.includes(role) ?? false;
}
