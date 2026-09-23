const STORAGE_KEY = "p2p_lab:provider_leave_dismissed";

export function openProviderUrl(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function isProviderLeaveDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function rememberProviderLeaveDismissed(): void {
  window.localStorage.setItem(STORAGE_KEY, "1");
}
