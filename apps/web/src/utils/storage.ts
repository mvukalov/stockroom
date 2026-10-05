// localStorage holds conveniences only (demo user, sidebar state). It can be missing or
// throw (private mode, blocked site data, quota), so every access falls back and the
// app keeps working without it.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not persisted: the value still applies for this session.
  }
}
