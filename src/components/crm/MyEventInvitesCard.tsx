/**
 * MyEventInvitesCard - Shows user's own invite summary for an event
 * 
 * Displayed on the activity detail page
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyEventInviteSummary, INVITE_STATUS_EMOJI } from "@/hooks/useEventInvites";
import { Users, Loader2 } from "lucide-react";

interface MyEventInvitesCardProps {
  eventId: string;
  className?: string;
}

export function MyEventInvitesCard({ eventId, className }: MyEventInvitesCardProps) {
  const { data: summary, isLoading } = useMyEventInviteSummary(eventId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.total_invited === 0) {
    return null; // Don't show if no invites
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Meus Convites
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            📨 {summary.total_invited} convidados
          </Badge>
          {summary.going > 0 && (
            <Badge variant="default" className="text-xs bg-green-600">
              {INVITE_STATUS_EMOJI.going} {summary.going} vão
            </Badge>
          )}
          {summary.maybe > 0 && (
            <Badge variant="secondary" className="text-xs">
              {INVITE_STATUS_EMOJI.maybe} {summary.maybe} talvez
            </Badge>
          )}
          {summary.declined > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {INVITE_STATUS_EMOJI.declined} {summary.declined} não vão
            </Badge>
          )}
          {summary.no_answer > 0 && (
            <Badge variant="outline" className="text-xs">
              {INVITE_STATUS_EMOJI.no_answer} {summary.no_answer} sem resposta
            </Badge>
          )}
          {summary.attended > 0 && (
            <Badge variant="default" className="text-xs">
              {INVITE_STATUS_EMOJI.attended} {summary.attended} compareceram
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
