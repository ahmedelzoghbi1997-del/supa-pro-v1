/**
 * Track locally initiated transactions so that Realtime listeners know not to
 * show duplicate "A partner added..." toast notifications to the author of the action.
 */
const recentActionIds = new Set<string>();

export function markLocalAction(id: string | number | undefined | null, ttlMs = 15000): void {
  if (!id) return;
  const key = String(id);
  recentActionIds.add(key);
  setTimeout(() => {
    recentActionIds.delete(key);
  }, ttlMs);
}

export function isLocalAction(id: string | number | undefined | null): boolean {
  if (!id) return false;
  return recentActionIds.has(String(id));
}
