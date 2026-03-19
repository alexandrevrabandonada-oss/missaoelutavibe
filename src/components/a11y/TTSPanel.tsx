import { Volume2, Settings2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TTSPanelProps {
  collapsed?: boolean;
}

export function TTSPanel({ collapsed = true }: TTSPanelProps) {
  const { supported, voices, settings, updateSettings, speak, stop, speaking } = useTTS();
  const [isOpen, setIsOpen] = useState(!collapsed);

  if (!supported) {
    return (
      <Card className="border-muted">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Volume2 className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Leitura em voz alta</p>
              <p className="text-xs">Não disponível neste navegador</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleTestVoice = () => {
    if (speaking) {
      stop();
    } else {
      speak("Esta é uma demonstração da leitura em voz alta. Escutar, cuidar, organizar.");
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-transparent">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Volume2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">Leitura em Voz Alta</CardTitle>
                    <CardDescription className="text-xs">
                      Ouça o conteúdo das missões e posts
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {settings.enabled && (
                    <Badge variant="default" className="text-xs">Ativo</Badge>
                  )}
                  <Settings2 className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </div>
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Enable Switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="tts-enabled" className="text-sm">
                Ativar TTS
              </Label>
              <Switch
                id="tts-enabled"
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
              />
            </div>

            {settings.enabled && (
              <>
                {/* Voice Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tts-voice" className="text-sm">
                    Voz
                  </Label>
                  <Select
                    value={settings.voiceId}
                    onValueChange={(voiceId) => updateSettings({ voiceId })}
                  >
                    <SelectTrigger id="tts-voice" className="w-full">
                      <SelectValue placeholder="Selecione uma voz" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <span className="truncate">
                            {voice.name}
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({voice.lang})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Speed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Velocidade</Label>
                    <span className="text-xs text-muted-foreground">{settings.rate.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[settings.rate]}
                    onValueChange={([rate]) => updateSettings({ rate })}
                    min={0.8}
                    max={1.2}
                    step={0.1}
                    className="w-full"
                    aria-label="Velocidade da leitura"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Lento</span>
                    <span>Rápido</span>
                  </div>
                </div>

                {/* Pitch */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Tom</Label>
                    <span className="text-xs text-muted-foreground">{settings.pitch.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[settings.pitch]}
                    onValueChange={([pitch]) => updateSettings({ pitch })}
                    min={0.9}
                    max={1.1}
                    step={0.05}
                    className="w-full"
                    aria-label="Tom da voz"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Grave</span>
                    <span>Agudo</span>
                  </div>
                </div>

                {/* Test Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestVoice}
                  className="w-full"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  {speaking ? "Parar Teste" : "Testar Voz"}
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
