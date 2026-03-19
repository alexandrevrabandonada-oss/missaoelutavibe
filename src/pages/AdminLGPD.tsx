import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  useLGPDRequests,
  useLGPDExport,
  useRetentionPolicies,
  useAuditLogs,
  LGPD_TIPO_LABELS,
  LGPD_STATUS_LABELS,
  LGPDRequestStatus,
} from "@/hooks/useLGPD";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  FileDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Database,
  ScrollText,
  ArrowLeft,
  Download,
  User,
  Calendar,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminLGPD() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("requests");

  if (!user || !profile) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 animate-slide-up pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Shield className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider font-bold">
                Conformidade
              </span>
            </div>
            <h1 className="text-2xl font-black">LGPD & Auditoria</h1>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="requests" className="flex-1">
              <FileDown className="h-4 w-4 mr-2" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="export" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex-1">
              <Database className="h-4 w-4 mr-2" />
              Retenção
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1">
              <ScrollText className="h-4 w-4 mr-2" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <RequestsPanel />
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            <ExportPanel />
          </TabsContent>

          <TabsContent value="retention" className="mt-4">
            <RetentionPanel />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

// Requests Panel
function RequestsPanel() {
  const { requests, isLoading, updateRequest, pendingCount } = useLGPDRequests();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [newStatus, setNewStatus] = useState<LGPDRequestStatus>("em_andamento");

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;

    try {
      await updateRequest.mutateAsync({
        id: selectedRequest,
        status: newStatus,
        resposta: resposta || undefined,
      });
      toast({ title: "Status atualizado!" });
      setSelectedRequest(null);
      setResposta("");
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: LGPDRequestStatus) => {
    switch (status) {
      case "aberto":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "em_andamento":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "concluido":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "negado":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">
                solicitações pendentes
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{requests.length}</p>
              <p className="text-sm text-muted-foreground">total de solicitações</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-bold">Nenhuma solicitação LGPD</p>
            <p className="text-sm text-muted-foreground">
              Solicitações de usuários aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                setSelectedRequest(request.id);
                setNewStatus(request.status);
                setResposta(request.resposta || "");
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(request.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline">
                        {LGPD_TIPO_LABELS[request.tipo]}
                      </Badge>
                      <Badge
                        variant={
                          request.status === "concluido"
                            ? "default"
                            : request.status === "negado"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {LGPD_STATUS_LABELS[request.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      User: {request.user_id.slice(0, 8)}...
                    </p>
                    {request.motivo && (
                      <p className="text-sm mt-1 line-clamp-2">{request.motivo}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Solicitação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Novo Status</label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as LGPDRequestStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Resposta / Justificativa
              </label>
              <Textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Descreva a ação tomada ou justificativa..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateRequest.isPending}
            >
              {updateRequest.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export Panel
function ExportPanel() {
  const { toast } = useToast();
  const exportMutation = useLGPDExport();
  const [userId, setUserId] = useState("");
  const [exportData, setExportData] = useState<object | null>(null);

  const handleExport = async () => {
    if (!userId.trim()) {
      toast({ title: "Informe o ID do usuário", variant: "destructive" });
      return;
    }

    try {
      const data = await exportMutation.mutateAsync(userId.trim());
      setExportData(data as object);
      toast({ title: "Export gerado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar export",
        description: error?.message || "Verifique se você tem permissão",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lgpd-export-${userId.slice(0, 8)}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Gerar Export de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera um arquivo JSON com todos os dados do usuário de forma
            sanitizada (sem dados de terceiros). Apenas administradores podem
            executar.
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="ID do usuário (UUID)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || !userId.trim()}
            >
              {exportMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Gerar
            </Button>
          </div>

          {exportData && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-sm">Export Pronto</p>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Baixar JSON
                </Button>
              </div>
              <pre className="text-xs overflow-auto max-h-64 bg-background p-3 rounded">
                {JSON.stringify(exportData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Categories Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados Incluídos no Export</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Perfil sanitizado (sem email/telefone)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Missões e evidências do usuário</span>
            </li>
            <li className="flex items-center gap-2">
              <FileDown className="h-4 w-4 text-muted-foreground" />
              <span>Tickets e posts criados</span>
            </li>
            <li className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Contatos CRM (sem PII de terceiros)</span>
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Origem e convites (admin-only)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Retention Panel
function RetentionPanel() {
  const { policies, isLoading, updatePolicy, applyRetention } =
    useRetentionPolicies();
  const { toast } = useToast();

  const handleApplyRetention = async () => {
    try {
      const results = await applyRetention.mutateAsync();
      toast({
        title: "Políticas aplicadas",
        description: `Processados: ${JSON.stringify(results)}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar políticas",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Políticas de Retenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Configure por quanto tempo cada tipo de dado deve ser mantido. Na v0,
            registros antigos são marcados como "arquivados" (não deletados).
          </p>

          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{policy.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Tabela: {policy.tabela}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={policy.dias_reter}
                    onChange={(e) =>
                      updatePolicy.mutate({
                        id: policy.id,
                        dias_reter: parseInt(e.target.value) || 365,
                      })
                    }
                    className="w-20 text-center"
                    min={30}
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
                <Badge variant={policy.ativo ? "default" : "secondary"}>
                  {policy.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Aplicar Políticas de Retenção</p>
              <p className="text-sm text-muted-foreground">
                Marca registros antigos como arquivados conforme as políticas
              </p>
            </div>
            <Button
              onClick={handleApplyRetention}
              disabled={applyRetention.isPending}
              variant="outline"
            >
              {applyRetention.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Executar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Audit Panel
function AuditPanel() {
  const { logs, isLoading } = useAuditLogs({ limit: 50 });
  const [filter, setFilter] = useState("");

  const filteredLogs = logs.filter(
    (log) =>
      log.action?.toLowerCase().includes(filter.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(filter.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por ação ou entidade..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ScrollText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-bold">Nenhum log encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="text-sm">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-muted-foreground">
                        {log.entity_type}
                      </span>
                    </div>
                    {log.entity_id && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        ID: {log.entity_id}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
