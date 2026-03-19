/**
 * App Mode Admin Panel v0
 * 
 * Allows admins to configure app mode (pre/campanha/pos) and brand pack.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAppMode, useSetAppMode } from "@/hooks/useAppMode";
import { formatAuditDate } from "@/hooks/useGovernanceAudit";
import { GovernanceHistorySheet } from "@/components/admin/GovernanceHistorySheet";
import { focusRingClass } from "@/utils/a11y";
import { 
  AppMode, 
  BrandPack, 
  MODE_LABELS, 
  BRAND_PACK_LABELS,
  getModeFlags 
} from "@/lib/brand";
import { 
  Settings2, 
  History, 
  Check, 
  AlertTriangle,
  Megaphone,
  Flag,
  Moon
} from "lucide-react";

// Focus ring class as string
const focusRing = focusRingClass();

const MODE_ICONS: Record<AppMode, React.ReactNode> = {
  pre: <Flag className="h-4 w-4" />,
  campanha: <Megaphone className="h-4 w-4" />,
  pos: <Moon className="h-4 w-4" />,
};

const MODE_DESCRIPTIONS: Record<AppMode, string> = {
  pre: "Fase de organização. Convites ativos, Kit de Impressão desabilitado, certificados privados.",
  campanha: "Campanha oficial. Todos os recursos habilitados, incluindo Kit de Impressão e certificados públicos.",
  pos: "Pós-eleição. Convites e templates desabilitados, foco em manutenção da base.",
};

export function AppModePanel() {
  const { toast } = useToast();
  const { mode, brandPack, updatedAt, isLoading } = useAppMode();
  const setAppMode = useSetAppMode();
  
  const [selectedMode, setSelectedMode] = useState<AppMode>(mode);
  const [selectedBrandPack, setSelectedBrandPack] = useState<BrandPack>(brandPack);
  const [showHistory, setShowHistory] = useState(false);

  // Sync with current values
  useEffect(() => {
    setSelectedMode(mode);
    setSelectedBrandPack(brandPack);
  }, [mode, brandPack]);

  const hasChanges = selectedMode !== mode || selectedBrandPack !== brandPack;
  const previewFlags = getModeFlags(selectedMode);

  const handleApply = async () => {
    try {
      await setAppMode.mutateAsync({ 
        mode: selectedMode, 
        brandPack: selectedBrandPack 
      });
      toast({
        title: "Configuração aplicada",
        description: `Modo alterado para ${MODE_LABELS[selectedMode]}.`,
      });
    } catch (error) {
      console.error("Error setting app mode:", error);
      toast({
        title: "Erro ao aplicar",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Modo de Operação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando configuração...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Modo de Operação
              </CardTitle>
              <CardDescription>
                Configure o modo do aplicativo e pacote de marca.
                {updatedAt && (
                  <span className="block text-xs mt-1">
                    Última alteração: {formatAuditDate(updatedAt)}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
              className={focusRing}
              aria-label="Ver histórico de alterações"
            >
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Fase de Operação</Label>
            <RadioGroup
              value={selectedMode}
              onValueChange={(v) => setSelectedMode(v as AppMode)}
              className="grid gap-3"
              aria-label="Selecione a fase de operação"
            >
              {(["pre", "campanha", "pos"] as AppMode[]).map((modeOption) => (
                <label
                  key={modeOption}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${focusRing} ${
                    selectedMode === modeOption
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem 
                    value={modeOption} 
                    id={`mode-${modeOption}`}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {MODE_ICONS[modeOption]}
                      <span className="font-medium">{MODE_LABELS[modeOption]}</span>
                      {modeOption === mode && (
                        <Badge variant="secondary" className="text-xs">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {MODE_DESCRIPTIONS[modeOption]}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Brand Pack Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Pacote de Marca</Label>
            <RadioGroup
              value={selectedBrandPack}
              onValueChange={(v) => setSelectedBrandPack(v as BrandPack)}
              className="flex gap-4"
              aria-label="Selecione o pacote de marca"
            >
              {(["eluta", "neutro"] as BrandPack[]).map((pack) => (
                <label
                  key={pack}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${focusRing} ${
                    selectedBrandPack === pack
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={pack} id={`pack-${pack}`} />
                  <span className="font-medium">{BRAND_PACK_LABELS[pack]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Preview Flags */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recursos no modo selecionado
            </Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <FlagItem label="Convites" enabled={previewFlags.invitesEnabled} />
              <FlagItem label="Kit de Impressão" enabled={previewFlags.printKitEnabled} />
              <FlagItem label="Compartilhar Fábrica" enabled={previewFlags.fabricaShareEnabled} />
              <FlagItem label="Certificados Públicos" enabled={previewFlags.publicCertificatesEnabled} />
              <FlagItem label="Templates" enabled={previewFlags.templatesEnabled} />
              <FlagItem label="Badge Pré-Campanha" enabled={previewFlags.showPreCampaignBadge} />
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleApply}
              disabled={!hasChanges || setAppMode.isPending}
              className={`w-full ${focusRing}`}
            >
              {setAppMode.isPending ? (
                "Aplicando..."
              ) : hasChanges ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Alterações
                </>
              ) : (
                "Nenhuma alteração"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Sheet */}
      <GovernanceHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        entityType="app_config"
        entityId="singleton"
        entityTitle="Configuração do App"
      />
    </>
  );
}

function FlagItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
      enabled ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"
    }`}>
      <div className={`h-2 w-2 rounded-full ${enabled ? "bg-green-500" : "bg-muted-foreground"}`} />
      <span>{label}</span>
    </div>
  );
}
