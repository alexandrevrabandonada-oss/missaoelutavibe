import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyContacts, useCRMMutations, CRM_STATUS_OPTIONS } from "@/hooks/useCRM";
import { maskWhatsApp } from "@/hooks/useCRMPrivacy";
import { MaskedWhatsAppField } from "@/components/crm/MaskedWhatsAppField";
import { DeleteContactDialog } from "@/components/crm/DeleteContactDialog";
import { PurgeContactsDialog } from "@/components/crm/PurgeContactsDialog";
import { ContactDetailDrawer } from "@/components/crm/ContactDetailDrawer";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { Database } from "@/integrations/supabase/types";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  UserCircle, 
  MapPin, 
  Clock, 
  AlertCircle,
  ChevronRight,
  MessageCircle
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

type CRMContatoStatus = Database["public"]["Enums"]["crm_contato_status"];

export default function VoluntarioCRM() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: contatos, isLoading } = useMyContacts();
  const { createContato } = useCRMMutations();
  const { mutate: logEvent } = useLogGrowthEvent();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Handle deep-link via query param (including filter)
  useEffect(() => {
    const contatoParam = searchParams.get("contato");
    if (contatoParam) {
      setSelectedContactId(contatoParam);
    }
    // Handle filter param (for daily plan integration)
    const filterParam = searchParams.get("filter");
    if (filterParam === "overdue") {
      setFilterStatus("followup");
    } else if (filterParam === "unknown") {
      setFilterStatus("unknown_support");
    } else if (filterParam === "qualified") {
      setFilterStatus("qualified_support");
    }
  }, [searchParams]);

  // Track contact creation from mutations (via onSuccess in useCRMMutations)
  useEffect(() => {
    const originalMutate = createContato.mutate;
    createContato.mutate = (...args) => {
      originalMutate(...args);
    };
  }, [createContato]);

  // Filter contacts
  const filteredContatos = contatos?.filter((c) => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.bairro?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    
    // Status filter
    let matchesStatus = true;
    if (filterStatus === "unknown_support") {
      matchesStatus = (c as any).support_level === "unknown";
    } else if (filterStatus === "qualified_support") {
      // Qualified = yes or mobilizer (people who have expressed support)
      matchesStatus = ["yes", "mobilizer"].includes((c as any).support_level || "");
    } else if (filterStatus !== "all") {
      matchesStatus = c.status === filterStatus;
    }
    
    return matchesSearch && matchesStatus;
  }) ?? [];

  // Separate follow-ups
  const followups = filteredContatos.filter(
    (c) => c.proxima_acao_em && (isPast(new Date(c.proxima_acao_em)) || isToday(new Date(c.proxima_acao_em)))
  );

  const getStatusColor = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-500";
  };

  const getStatusLabel = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  };

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setSearchParams({ contato: contactId }, { replace: true });
  };

  const handleCloseDrawer = () => {
    setSelectedContactId(null);
    searchParams.delete("contato");
    searchParams.delete("from");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <AppShell>
      <div className="p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Meus Contatos</h1>
              <p className="text-sm text-muted-foreground">
                {contatos?.length ?? 0} apoiadores registrados
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/voluntario/crm/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </div>

        {/* LGPD Purge Option */}
        {contatos && contatos.length > 0 && (
          <div className="flex justify-end">
            <PurgeContactsDialog totalContacts={contatos.length} />
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, bairro, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unknown_support">Não qualificados</SelectItem>
              {CRM_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : filteredContatos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                {contatos?.length === 0
                  ? "Você ainda não registrou nenhum contato"
                  : "Nenhum contato encontrado com os filtros atuais"}
              </p>
              {contatos?.length === 0 && (
                <Button onClick={() => navigate("/voluntario/crm/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primeiro contato
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                Todos ({filteredContatos.length})
              </TabsTrigger>
              <TabsTrigger value="followup" className="flex-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                Follow-up ({followups.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {filteredContatos.map((contato) => (
                <ContatoCard
                  key={contato.id}
                  contato={contato}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  onClick={() => handleContactClick(contato.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="followup" className="space-y-3 mt-4">
              {followups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum follow-up pendente! 🎉
                </p>
              ) : (
                followups.map((contato) => (
                  <ContatoCard
                    key={contato.id}
                    contato={contato}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    onClick={() => handleContactClick(contato.id)}
                    showFollowupWarning
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Contact Detail Drawer */}
      <ContactDetailDrawer
        contactId={selectedContactId}
        onClose={handleCloseDrawer}
      />
    </AppShell>
  );
}

function ContatoCard({
  contato,
  getStatusColor,
  getStatusLabel,
  onClick,
  showFollowupWarning,
}: {
  contato: any;
  getStatusColor: (s: any) => string;
  getStatusLabel: (s: any) => string;
  onClick: () => void;
  showFollowupWarning?: boolean;
}) {
  const isOverdue = contato.proxima_acao_em && isPast(new Date(contato.proxima_acao_em));
  const isDueToday = contato.proxima_acao_em && isToday(new Date(contato.proxima_acao_em));

  return (
    <Card
      className={`hover:border-primary/50 transition-colors cursor-pointer ${
        showFollowupWarning && isOverdue ? "border-destructive/50" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{contato.nome}</h3>
              <Badge className={`${getStatusColor(contato.status)} text-white text-xs`}>
                {getStatusLabel(contato.status)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {contato.bairro && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {contato.bairro}
                </span>
              )}
              {contato.whatsapp_last4 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {maskWhatsApp(contato.whatsapp_last4)}
                </span>
              )}
            </div>

            {contato.tags && contato.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contato.tags.slice(0, 3).map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {contato.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{contato.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {contato.proxima_acao_em && (
              <div
                className={`flex items-center gap-1 text-xs mt-2 ${
                  isOverdue
                    ? "text-destructive"
                    : isDueToday
                    ? "text-orange-500"
                    : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                Follow-up: {format(new Date(contato.proxima_acao_em), "dd/MM HH:mm", { locale: ptBR })}
                {isOverdue && " (atrasado)"}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <DeleteContactDialog 
              contactId={contato.id} 
              contactName={contato.nome} 
            />
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
