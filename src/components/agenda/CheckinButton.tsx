import { useAtividadeRsvp } from "@/hooks/useAtividades";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckinButtonProps {
  atividadeId: string;
  className?: string;
}

export function CheckinButton({ atividadeId, className }: CheckinButtonProps) {
  const { myRsvp, checkin, isCheckingIn, isLoadingMyRsvp } = useAtividadeRsvp(atividadeId);

  if (isLoadingMyRsvp) {
    return <div className="h-10 w-32 bg-muted animate-pulse rounded" />;
  }

  // Only show if user has RSVP with vou or talvez
  if (!myRsvp || myRsvp.status === "nao_vou") {
    return null;
  }

  // Already checked in
  if (myRsvp.checkin_em) {
    return (
      <div className={cn("flex items-center gap-2 text-green-600 font-medium", className)}>
        <Check className="h-4 w-4" />
        <span>Check-in realizado</span>
      </div>
    );
  }

  return (
    <Button
      onClick={() => checkin()}
      disabled={isCheckingIn}
      className={cn("bg-green-600 hover:bg-green-700", className)}
    >
      <MapPin className="h-4 w-4 mr-2" />
      {isCheckingIn ? "Registrando..." : "Fazer Check-in"}
    </Button>
  );
}
