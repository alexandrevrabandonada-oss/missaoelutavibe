/**
 * Invite Flow Configuration
 * 
 * Centralized config for invite-related features including WhatsApp templates.
 */

export const INVITE_CONFIG = {
  // WhatsApp number for requesting invites (Brazil format)
  whatsappNumber: "5521999999999", // TODO: Update to real support number
  
  // Message templates
  requestInviteMessage: (invalidCode?: string) => {
    const base = "Olá! Gostaria de participar do Missão ÉLuta.";
    if (invalidCode) {
      return `${base} Tentei usar o código "${invalidCode}" mas parece que não está mais válido. Pode me enviar um novo convite?`;
    }
    return `${base} Como faço para receber um convite?`;
  },
  
  // Build WhatsApp URL
  getWhatsAppUrl: (invalidCode?: string) => {
    const message = INVITE_CONFIG.requestInviteMessage(invalidCode);
    return `https://wa.me/${INVITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  },
  
  // Invite storage TTL (30 minutes in ms)
  inviteStorageTTL: 30 * 60 * 1000,
};

/**
 * Check if there's a valid stored invite
 */
export function hasValidStoredInvite(): boolean {
  const ref = localStorage.getItem("invite_ref");
  const ts = localStorage.getItem("invite_ref_ts");
  
  if (!ref || !ts) return false;
  
  const age = Date.now() - parseInt(ts, 10);
  if (age > INVITE_CONFIG.inviteStorageTTL) {
    // Expired, clean up
    clearStoredInvite();
    return false;
  }
  
  return true;
}

/**
 * Get stored invite data (with 30min expiry check)
 */
export function getStoredInvite(): { ref: string; next: string } | null {
  const ref = localStorage.getItem("invite_ref");
  const ts = localStorage.getItem("invite_ref_ts");
  const next = localStorage.getItem("invite_next") || "/voluntario";
  
  if (!ref || !ts) return null;
  
  const age = Date.now() - parseInt(ts, 10);
  if (age > INVITE_CONFIG.inviteStorageTTL) {
    clearStoredInvite();
    return null;
  }
  
  return { ref, next };
}

/**
 * Store invite data with timestamp
 */
export function storeInvite(ref: string, next: string = "/voluntario") {
  localStorage.setItem("invite_ref", ref);
  localStorage.setItem("invite_ref_ts", Date.now().toString());
  localStorage.setItem("invite_next", next);
  sessionStorage.setItem("invite_code", ref);
}

/**
 * Clear stored invite data
 */
export function clearStoredInvite() {
  localStorage.removeItem("invite_ref");
  localStorage.removeItem("invite_ref_ts");
  localStorage.removeItem("invite_next");
  sessionStorage.removeItem("invite_code");
}
