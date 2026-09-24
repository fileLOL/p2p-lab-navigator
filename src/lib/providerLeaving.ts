const STORAGE_KEY = "p2p_lab:provider_leave_dismissed";

export function openProviderUrl(url: string): void {
  if (typeof window === "undefined") return;
  // Use a real link click: popup blockers and embedded previews treat it as
  // a normal user navigation instead of a scripted popup.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function isProviderLeaveDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function rememberProviderLeaveDismissed(): void {
  window.localStorage.setItem(STORAGE_KEY, "1");
}
