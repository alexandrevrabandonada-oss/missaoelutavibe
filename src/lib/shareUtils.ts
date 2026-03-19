/**
 * Unified Share Utilities
 * 
 * SINGLE SOURCE OF TRUTH for all share links in the app.
 * Every share (WhatsApp, copy, native) MUST use these functions
 * to guarantee consistent ref= tracking.
 * 
 * Format: <BASE_URL>/<path>?ref=<invite_code>
 * No UTM params, no cidade param — just ref for attribution.
 * Fallback: if no invite_code, link works without ref (no crash).
 */

/**
 * Resolve the canonical public base URL.
 * Priority: VITE env override → published production URL.
 * Exported so other modules can import instead of hardcoding.
 */
export const PUBLISHED_URL: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_URL) ||
  "https://missaoeluta.lovable.app";

/**
 * Build a share URL with ref= attribution.
 * @param path - Route path (e.g. "/r/ABC123", "/s/cert/XYZ")
 * @param inviteCode - User's personal invite_code (nullable — safe fallback)
 */
export function buildShareUrl(path: string, inviteCode?: string | null): string {
  const base = `${PUBLISHED_URL}${path}`;
  if (inviteCode) {
    const separator = path.includes("?") ? "&" : "?";
    return `${base}${separator}ref=${encodeURIComponent(inviteCode)}`;
  }
  return base;
}

/**
 * Build the canonical invite link for a user.
 * Uses profile invite_code for personal attribution.
 */
export function buildInviteShareUrl(inviteCode?: string | null): string {
  if (!inviteCode) return PUBLISHED_URL;
  return buildShareUrl(`/r/${inviteCode}`);
  // Result: https://missaoeluta.lovable.app/r/ABC123?ref=ABC123
}

/**
 * Build a certificate share URL with ref.
 */
export function buildCertShareUrl(certCode: string, inviteCode?: string | null): string {
  return buildShareUrl(`/s/cert/${certCode}`, inviteCode);
}

/**
 * Open WhatsApp with pre-filled message.
 * Always uses wa.me for maximum compatibility.
 */
export function openWhatsAppShare(message: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

/**
 * Copy text to clipboard with fallback for older browsers.
 * Returns true if successful.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  }
}

/**
 * Standard invite message for WhatsApp shares.
 */
export function buildInviteMessage(inviteCode?: string | null): string {
  const link = buildInviteShareUrl(inviteCode);
  return `🔥 Entre no movimento! Faça a diferença em 10 min:\n${link}`;
}

/**
 * Standard post-mission share message.
 * Uses mission's share_message from meta_json if available.
 */
export function buildMissionShareMessage(
  customMessage: string | null | undefined,
  inviteCode?: string | null,
): string {
  const link = buildInviteShareUrl(inviteCode);
  if (customMessage) {
    // Append link if not already present
    if (customMessage.includes("missaoeluta.lovable.app")) return customMessage;
    return `${customMessage}\n${link}`;
  }
  return `Acabei de agir pelo movimento! Vem junto:\n${link}`;
}
