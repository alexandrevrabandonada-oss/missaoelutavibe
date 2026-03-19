import { useAtividadeRsvp, RsvpStatus, RSVP_STATUS_LABELS } from "@/hooks/useAtividades";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RsvpButtonsProps {
  atividadeId: string;
  compact?: boolean;
}

export function RsvpButtons({ atividadeId, compact = false }: RsvpButtonsProps) {
  const { myRsvp, setRsvp, removeRsvp, isSettingRsvp, isLoadingMyRsvp } = useAtividadeRsvp(atividadeId);

  const handleRsvp = async (status: RsvpStatus) => {
    if (myRsvp?.status === status) {
      // Toggle off
      await removeRsvp();
    } else {
      await setRsvp(status);
    }
  };

  if (isLoadingMyRsvp) {
    return (
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const currentStatus = myRsvp?.status;

  if (compact) {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={currentStatus === "vou" ? "default" : "outline"}
          className={cn(
            "h-7 px-2",
            currentStatus === "vou" && "bg-green-600 hover:bg-green-700"
          )}
          onClick={() => handleRsvp("vou")}
          disabled={isSettingRsvp}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={currentStatus === "talvez" ? "default" : "outline"}
          className={cn(
            "h-7 px-2",
            currentStatus === "talvez" && "bg-yellow-600 hover:bg-yellow-700"
          )}
          onClick={() => handleRsvp("talvez")}
          disabled={isSettingRsvp}
        >
          <HelpCircle className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={currentStatus === "nao_vou" ? "default" : "outline"}
          className={cn(
            "h-7 px-2",
            currentStatus === "nao_vou" && "bg-muted-foreground hover:bg-muted-foreground/80"
          )}
          onClick={() => handleRsvp("nao_vou")}
          disabled={isSettingRsvp}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={currentStatus === "vou" ? "default" : "outline"}
        className={cn(
          currentStatus === "vou" && "bg-green-600 hover:bg-green-700"
        )}
        onClick={() => handleRsvp("vou")}
        disabled={isSettingRsvp}
      >
        <Check className="h-4 w-4 mr-2" />
        Vou
      </Button>
      <Button
        variant={currentStatus === "talvez" ? "default" : "outline"}
        className={cn(
          currentStatus === "talvez" && "bg-yellow-600 hover:bg-yellow-700"
        )}
        onClick={() => handleRsvp("talvez")}
        disabled={isSettingRsvp}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Talvez
      </Button>
      <Button
        variant={currentStatus === "nao_vou" ? "default" : "outline"}
        className={cn(
          currentStatus === "nao_vou" && "bg-muted-foreground hover:bg-muted-foreground/80"
        )}
        onClick={() => handleRsvp("nao_vou")}
        disabled={isSettingRsvp}
      >
        <X className="h-4 w-4 mr-2" />
        Não vou
      </Button>
    </div>
  );
}
