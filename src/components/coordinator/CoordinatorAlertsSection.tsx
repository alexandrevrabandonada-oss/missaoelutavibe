/**
 * CoordinatorAlertsSection - Alerts for coordinators
 * 
 * Displays up to 3 alerts from the coordinator's scope with action buttons.
 * Now includes drilldown for funnel analysis and cohort actions.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Megaphone,
  CheckCircle2,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useCoordinatorAlerts, type CoordinatorAlert } from "@/hooks/useCoordinatorAlerts";
import { useAppMode } from "@/hooks/useAppMode";
import {
  getPlaybook,
  getPlaybookMessages,
  getAlertTitle,
  buildAnnouncementPrefillUrl,
} from "@/lib/coordinatorPlaybooks";
import { DrilldownSheet } from "./DrilldownSheet";

export function CoordinatorAlertsSection() {
  const navigate = useNavigate();
  const { mode } = useAppMode();
  const {
    alerts,
    scopeKind,
    scopeValue,
    isLoading,
    dismissAlert,
    isDismissing,
    trackAlertOpened,
    trackCopyClicked,
    trackCreateAnnouncementClicked,
    trackOpenActionClicked,
  } = useCoordinatorAlerts(7);

  const [selectedAlert, setSelectedAlert] = useState<CoordinatorAlert | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownAlertKey, setDrilldownAlertKey] = useState<string>("");

  // Show only first 3 alerts
  const visibleAlerts = alerts.slice(0, 3);

  const handleOpenAlert = (alert: CoordinatorAlert) => {
    setSelectedAlert(alert);
    setSheetOpen(true);
    trackAlertOpened(alert.key, scopeKind);
  };

  const handleOpenDrilldown = (alertKey: string) => {
    setDrilldownAlertKey(alertKey);
    setDrilldownOpen(true);
    setSheetOpen(false);
  };

  const handleCopyMessage = (variant: "short" | "mid" | "leader") => {
    if (!selectedAlert) return;
    
    const messages = getPlaybookMessages(selectedAlert.key, mode);
    if (!messages) return;

    const text = messages[variant];
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
    trackCopyClicked(selectedAlert.key, variant);
  };

  const handleCreateAnnouncement = () => {
    if (!selectedAlert) return;
    
    const url = buildAnnouncementPrefillUrl(selectedAlert.key, scopeKind, scopeValue);
    trackCreateAnnouncementClicked(selectedAlert.key);
    setSheetOpen(false);
    navigate(url);
  };

  const handleOpenAction = (path: string) => {
    if (!selectedAlert) return;
    
    trackOpenActionClicked(selectedAlert.key, path);
    setSheetOpen(false);
    navigate(path);
  };

  const handleDismiss = async () => {
    if (!selectedAlert) return;
    
    try {
      await dismissAlert({ alertKey: selectedAlert.key, hours: 24 });
      toast.success("Alerta marcado como feito por 24h");
      setSheetOpen(false);
      setSelectedAlert(null);
    } catch {
      toast.error("Erro ao marcar alerta");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (visibleAlerts.length === 0) {
    return null; // Don't show section if no alerts
  }

  return (
    <>
      <Card className="border-amber-500/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas do seu escopo
            <Badge variant="outline" className="ml-auto text-xs">
              {visibleAlerts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleAlerts.map((alert) => (
            <AlertCard
              key={alert.key}
              alert={alert}
              onOpen={() => handleOpenAlert(alert)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Playbook Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          {selectedAlert && (
            <PlaybookContent
              alert={selectedAlert}
              mode={mode}
              onCopy={handleCopyMessage}
              onCreateAnnouncement={handleCreateAnnouncement}
              onOpenAction={handleOpenAction}
              onDismiss={handleDismiss}
              isDismissing={isDismissing}
              onOpenDrilldown={() => handleOpenDrilldown(selectedAlert.key)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Drilldown Sheet */}
      <DrilldownSheet
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        alertKey={drilldownAlertKey}
        scopeKind={scopeKind}
        scopeValue={scopeValue}
      />
    </>
  );
}

function AlertCard({
  alert,
  onOpen,
}: {
  alert: CoordinatorAlert;
  onOpen: () => void;
}) {
  const playbook = getPlaybook(alert.key);
  const title = getAlertTitle(alert.key);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors flex items-center gap-3"
    >
      <div
        className={`p-2 rounded-full ${
          alert.severity === "critical"
            ? "bg-destructive/10 text-destructive"
            : "bg-amber-500/10 text-amber-600"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {alert.hint}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function PlaybookContent({
  alert,
  mode,
  onCopy,
  onCreateAnnouncement,
  onOpenAction,
  onDismiss,
  isDismissing,
  onOpenDrilldown,
}: {
  alert: CoordinatorAlert;
  mode: "pre" | "campanha" | "pos";
  onCopy: (variant: "short" | "mid" | "leader") => void;
  onCreateAnnouncement: () => void;
  onOpenAction: (path: string) => void;
  onDismiss: () => void;
  isDismissing: boolean;
  onOpenDrilldown: () => void;
}) {
  const playbook = getPlaybook(alert.key);
  const messages = getPlaybookMessages(alert.key, mode);

  if (!playbook || !messages) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Playbook não encontrado
      </div>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <AlertTriangle
            className={
              alert.severity === "critical"
                ? "h-5 w-5 text-destructive"
                : "h-5 w-5 text-amber-500"
            }
          />
          {playbook.title}
        </SheetTitle>
        <SheetDescription>{playbook.subtitle}</SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* Messages */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Mensagens prontas</h3>

          <MessageCard
            label="Curta (WhatsApp)"
            text={messages.short}
            onCopy={() => onCopy("short")}
          />

          <MessageCard
            label="Média (mais contexto)"
            text={messages.mid}
            onCopy={() => onCopy("mid")}
          />

          <MessageCard
            label="Para líderes"
            text={messages.leader}
            onCopy={() => onCopy("leader")}
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Ações rápidas</h3>

          {/* Drilldown button - primary action */}
          <Button
            variant="default"
            className="w-full justify-start"
            onClick={onOpenDrilldown}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver detalhes e lista de voluntários
          </Button>

          {playbook.actions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              className="w-full justify-start"
              onClick={() => onOpenAction(action.path)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onCreateAnnouncement}
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Criar anúncio
          </Button>
        </div>

        {/* Dismiss */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={onDismiss}
          disabled={isDismissing}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {isDismissing ? "Marcando..." : "Marcar como feito (24h)"}
        </Button>
      </div>
    </>
  );
}

function MessageCard({
  label,
  text,
  onCopy,
}: {
  label: string;
  text: string;
  onCopy: () => void;
}) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="h-3 w-3 mr-1" />
          Copiar
        </Button>
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
