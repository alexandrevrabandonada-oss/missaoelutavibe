/**
 * safeIdentity - Central helper for safe volunteer identity display
 * 
 * Rules (congeladas):
 * - Never expose full_name directly in UI
 * - First name + initial of last name: "João S."
 * - Fallback: "Voluntário"
 */

export function getSafeDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return "Voluntário";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "Voluntário";
  return `${parts[0]} ${parts[1][0]}.`;
}
