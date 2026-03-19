import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  MessageCircle,
  Clock,
  Loader2,
  Check,
  Phone,
} from "lucide-react";
import { useQuickAddContact, QuickAddContactParams } from "@/hooks/useQuickAddContact";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { useFirstAction } from "@/hooks/useFirstAction";

const QUICK_TAGS = [
  { key: "apoia", label: "Apoia", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { key: "indeciso", label: "Indeciso", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { key: "lideranca", label: "Liderança", color: "bg-primary/20 text-primary border-primary/30" },
  { key: "comercio", label: "Comércio", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { key: "trabalhador", label: "Trabalhador", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { key: "familia", label: "Família", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
];

const SCHEDULE_OPTIONS = [
  { value: "24", label: "24 horas" },
  { value: "48", label: "48 horas" },
  { value: "72", label: "72 horas" },
];

interface QuickAddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origem?: "rua" | "conversa" | "manual" | "qr";
  context?: Record<string, unknown>;
  onSuccess?: (result: { contact_id: string; is_new: boolean }) => void;
  showWhatsAppButton?: boolean;
}

export function QuickAddContactModal({
  open,
  onOpenChange,
  origem = "manual",
  context = {},
  onSuccess,
  showWhatsAppButton = true,
}: QuickAddContactModalProps) {
  const { upsertContact, isLoading, openWhatsApp } = useQuickAddContact();
  const { inviteCode } = useInviteLoop();
  const { needsFirstAction, completeFirstAction } = useFirstAction();

  const [whatsapp, setWhatsapp] = useState("");
  const [nome, setNome] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scheduleFollowup, setScheduleFollowup] = useState(true);
  const [scheduleHours, setScheduleHours] = useState("48");
  const [savedContact, setSavedContact] = useState<{ id: string; whatsapp: string } | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setWhatsapp("");
      setNome("");
      setSelectedTags([]);
      setScheduleFollowup(true);
      setScheduleHours("48");
      setSavedContact(null);
    }
  }, [open]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!whatsapp.trim()) {
      return;
    }

    const params: QuickAddContactParams = {
      whatsapp: whatsapp.trim(),
      nome: nome.trim() || undefined,
      tags: selectedTags,
      origem,
      context,
    };

    if (scheduleFollowup) {
      params.scheduleKind = "followup";
      params.scheduleInHours = parseInt(scheduleHours);
    }

    try {
      const result = await upsertContact(params);
      setSavedContact({ id: result.contact_id, whatsapp: whatsapp.trim() });
      
      // Mark first action complete if needed (CRM as fallback)
      if (needsFirstAction && result.is_new) {
        completeFirstAction("crm");
      }
      
      onSuccess?.(result);
    } catch (error) {
      console.error("Error saving contact:", error);
    }
  };

  const handleWhatsApp = () => {
    if (savedContact) {
      openWhatsApp(
        savedContact.whatsapp,
        "Oi! Tudo bem? Queria te convidar pra conhecer o movimento ÉLuta!",
        inviteCode || undefined
      );
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastro Rápido
          </DialogTitle>
          <DialogDescription>
            Adicione um contato em segundos
          </DialogDescription>
        </DialogHeader>

        {!savedContact ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* WhatsApp - Required */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp *
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Nome - Optional */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome (opcional)</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Como a pessoa se chama?"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            {/* Quick Tags */}
            <div className="space-y-2">
              <Label>Tags rápidas</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag) => (
                  <Badge
                    key={tag.key}
                    variant="outline"
                    className={`cursor-pointer transition-all ${
                      selectedTags.includes(tag.key)
                        ? tag.color
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => toggleTag(tag.key)}
                  >
                    {selectedTags.includes(tag.key) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Schedule Follow-up */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="schedule"
                  checked={scheduleFollowup}
                  onCheckedChange={(checked) => setScheduleFollowup(!!checked)}
                />
                <Label
                  htmlFor="schedule"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Agendar follow-up
                </Label>
              </div>

              {scheduleFollowup && (
                <Select value={scheduleHours} onValueChange={setScheduleHours}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        Em {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!whatsapp.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Salvar Contato
                </>
              )}
            </Button>
          </form>
        ) : (
          /* Success State */
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-500">Contato salvo!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {scheduleFollowup
                  ? `Follow-up agendado para ${scheduleHours}h`
                  : "Sem follow-up agendado"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {showWhatsAppButton && (
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Abrir WhatsApp com Roteiro
                </Button>
              )}
              <Button variant="outline" onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
