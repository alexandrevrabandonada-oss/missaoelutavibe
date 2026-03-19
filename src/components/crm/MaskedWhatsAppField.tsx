import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, ExternalLink } from "lucide-react";
import { useCRMPrivacy, maskWhatsApp } from "@/hooks/useCRMPrivacy";
import { toast } from "sonner";

interface MaskedWhatsAppFieldProps {
  contactId: string;
  last4: string | null;
  className?: string;
  showActions?: boolean;
}

export function MaskedWhatsAppField({
  contactId,
  last4,
  className = "",
  showActions = true,
}: MaskedWhatsAppFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [fullNumber, setFullNumber] = useState<string | null>(null);
  const { revealWhatsApp } = useCRMPrivacy();

  const handleReveal = async () => {
    if (revealed && fullNumber) {
      setRevealed(false);
      return;
    }

    const result = await revealWhatsApp.mutateAsync(contactId);
    
    if (result.ok && result.whatsapp) {
      setFullNumber(result.whatsapp);
      setRevealed(true);
    } else if (result.error === "forbidden") {
      toast.error("Você não tem permissão para ver este número");
    } else if (result.error === "not_found") {
      toast.error("Contato não encontrado");
    }
  };

  const handleCopy = async () => {
    if (!revealed || !fullNumber) {
      // Need to reveal first
      const result = await revealWhatsApp.mutateAsync(contactId);
      if (result.ok && result.whatsapp_norm) {
        await navigator.clipboard.writeText(result.whatsapp_norm);
        toast.success("Número copiado!");
      }
    } else if (fullNumber) {
      // Already revealed, just copy the normalized version
      const normalized = fullNumber.replace(/\D/g, "");
      await navigator.clipboard.writeText(normalized);
      toast.success("Número copiado!");
    }
  };

  const handleOpenWhatsApp = async () => {
    let number = fullNumber?.replace(/\D/g, "");
    
    if (!number) {
      // Need to reveal first
      const result = await revealWhatsApp.mutateAsync(contactId);
      if (result.ok && result.whatsapp_norm) {
        number = result.whatsapp_norm;
      } else {
        return;
      }
    }

    // Add country code if not present
    if (number && !number.startsWith("55")) {
      number = "55" + number;
    }

    window.open(`https://wa.me/${number}`, "_blank");
  };

  const displayValue = revealed && fullNumber ? fullNumber : maskWhatsApp(last4);

  if (!last4) {
    return <span className={`text-muted-foreground ${className}`}>—</span>;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm">{displayValue}</span>
      
      {showActions && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleReveal}
            disabled={revealWhatsApp.isPending}
            title={revealed ? "Ocultar número" : "Revelar número"}
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            disabled={revealWhatsApp.isPending}
            title="Copiar número"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleOpenWhatsApp}
            disabled={revealWhatsApp.isPending}
            title="Abrir WhatsApp"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
