// Client-only helpers for Session Maps identity.
// A guest id is stable per browser (localStorage) so an anonymous joiner keeps
// the same cursor/identity across reconnects; the typed name is per-tab session.
const GUEST_ID_KEY = "tark.session.guestId";
const GUEST_NAME_KEY = "tark.session.guestName";

export function getOrCreateGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function setGuestName(name: string): void {
  sessionStorage.setItem(GUEST_NAME_KEY, name);
}

export function getGuestName(): string {
  return sessionStorage.getItem(GUEST_NAME_KEY) ?? "";
}
