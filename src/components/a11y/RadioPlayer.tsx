import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  ExternalLink,
  Radio,
  VolumeX,
} from "lucide-react";
import type { RadioItem } from "@/hooks/useRadioQueue";

interface RadioPlayerProps {
  currentItem: RadioItem | null;
  currentIndex: number;
  totalItems: number;
  isPlaying: boolean;
  isPaused: boolean;
  ttsSupported: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
  compact?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  plano: "Plano",
  meta: "Meta",
  atividade: "Agenda",
  tarefa: "Tarefa",
  missao: "Missão",
  top: "Top",
};

export function RadioPlayer({
  currentItem,
  currentIndex,
  totalItems,
  isPlaying,
  isPaused,
  ttsSupported,
  onPlay,
  onPause,
  onResume,
  onStop,
  onNext,
  onPrev,
  onClose,
  compact = false,
}: RadioPlayerProps) {
  if (!ttsSupported) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-3 flex items-center gap-2 text-muted-foreground">
          <VolumeX className="h-4 w-4" />
          <span className="text-sm">Narração não suportada neste navegador</span>
        </CardContent>
      </Card>
    );
  }

  if (!currentItem) {
    return null;
  }

  const progress = totalItems > 0 ? ((currentIndex + 1) / totalItems) * 100 : 0;
  const sourceLabel = SOURCE_LABELS[currentItem.source] || currentItem.source;

  if (compact) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPrev}
                disabled={currentIndex === 0}
                aria-label="Item anterior"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10"
                onClick={isPlaying && !isPaused ? onPause : isPaused ? onResume : onPlay}
                aria-label={isPlaying && !isPaused ? "Pausar" : "Reproduzir"}
              >
                {isPlaying && !isPaused ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNext}
                disabled={currentIndex >= totalItems - 1}
                aria-label="Próximo item"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentItem.title}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {sourceLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1}/{totalItems}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onStop}
              aria-label="Parar"
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
          
          <Progress value={progress} className="h-1 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary animate-pulse" aria-hidden="true" />
          <span className="text-sm font-bold uppercase tracking-wider text-primary">
            Modo Rádio
          </span>
          <Badge variant="secondary" className="text-xs ml-auto">
            {currentIndex + 1} de {totalItems}
          </Badge>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-1.5" />

        {/* Current Item */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sourceLabel}
            </Badge>
          </div>
          <h3 className="font-medium text-base">{currentItem.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {currentItem.text}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            disabled={currentIndex === 0}
            aria-label="Item anterior"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="default"
            size="lg"
            className="h-12 w-12 rounded-full"
            onClick={isPlaying && !isPaused ? onPause : isPaused ? onResume : onPlay}
            aria-label={isPlaying && !isPaused ? "Pausar" : "Reproduzir"}
          >
            {isPlaying && !isPaused ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            disabled={currentIndex >= totalItems - 1}
            aria-label="Próximo item"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={onStop}
          >
            <Square className="h-3 w-3 mr-1" />
            Parar
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            asChild
          >
            <Link to={currentItem.href}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir item
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini card for Hoje page
interface RadioMiniCardProps {
  estimatedMinutes: number;
  itemCount: number;
  ttsSupported: boolean;
  onStart: () => void;
}

export function RadioMiniCard({
  estimatedMinutes,
  itemCount,
  ttsSupported,
  onStart,
}: RadioMiniCardProps) {
  if (!ttsSupported || itemCount === 0) {
    return null;
  }

  return (
    <Card 
      className="border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
      onClick={onStart}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStart();
        }
      }}
      aria-label={`Iniciar rádio do dia com ${itemCount} itens, aproximadamente ${estimatedMinutes} minutos`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Radio className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Rádio do Dia</p>
          <p className="text-xs text-muted-foreground">
            {itemCount} itens • ~{estimatedMinutes} min
          </p>
        </div>
        <Play className="h-5 w-5 text-primary" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
