import { useProfile } from "./useProfile";
import { buildInviteShareUrl } from "@/lib/shareUtils";

/**
 * Returns the current user's personal invite code and link.
 * Every profile has an auto-generated invite_code column.
 * Link format: https://missaoeluta.lovable.app/r/<code>?ref=<code>
 */
export function usePersonalInviteCode() {
  const { profile, isLoading } = useProfile();

  const inviteCode = (profile?.invite_code as string | undefined) ?? null;
  const inviteLink = inviteCode ? buildInviteShareUrl(inviteCode) : "";

  return { inviteCode, inviteLink, isLoading };
}
