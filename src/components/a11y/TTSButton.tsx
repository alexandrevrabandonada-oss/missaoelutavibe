import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Volume2, VolumeX, Pause, StopCircle } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";

interface TTSButtonProps {
  text: string;
  variant?: "compact" | "iconOnly";
  className?: string;
  label?: string;
}

export function TTSButton({ 
  text, 
  variant = "compact", 
  className,
  label = "Ouvir"
}: TTSButtonProps) {
  const { supported, speaking, paused, speak, toggle, stop } = useTTS();

  if (!supported) {
    return null;
  }

  const handleClick = () => {
    if (speaking) {
      if (paused) {
        toggle(); // resume
      } else {
        stop();
      }
    } else {
      speak(text);
    }
  };

  const getIcon = () => {
    if (speaking && !paused) {
      return <Pause className="h-4 w-4" />;
    }
    if (speaking && paused) {
      return <Volume2 className="h-4 w-4" />;
    }
    return <Volume2 className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (speaking && !paused) return "Pausar";
    if (speaking && paused) return "Continuar";
    return label;
  };

  const ariaLabel = speaking && !paused 
    ? "Pausar leitura" 
    : speaking && paused 
    ? "Continuar leitura" 
    : `${label}: ler conteúdo em voz alta`;

  if (variant === "iconOnly") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={cn("h-8 w-8", className)}
            aria-label={ariaLabel}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getLabel()}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn("gap-2", className)}
      aria-label={ariaLabel}
    >
      {getIcon()}
      <span>{getLabel()}</span>
      {speaking && !paused && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            stop();
          }}
          className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
          aria-label="Parar leitura"
        >
          <StopCircle className="h-3 w-3 text-destructive" />
        </button>
      )}
    </Button>
  );
}
