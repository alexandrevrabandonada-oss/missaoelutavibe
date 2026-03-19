/**
 * Certificate Privacy Settings Component
 * Allows the certificate owner to configure public visibility
 */
import { useState } from "react";
import { Copy, ExternalLink, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FormacaoCertificate, useCertificates } from "@/hooks/useCertificates";

import { PUBLISHED_URL } from "@/lib/shareUtils";

interface CertificatePrivacySettingsProps {
  certificate: FormacaoCertificate;
}

export function CertificatePrivacySettings({
  certificate,
}: CertificatePrivacySettingsProps) {
  const { setPrivacy } = useCertificates();
  
  const [publicEnabled, setPublicEnabled] = useState(
    certificate.public_enabled ?? true
  );
  const [visibility, setVisibility] = useState<"full" | "initials" | "anon">(
    (certificate.public_visibility as "full" | "initials" | "anon") ?? "full"
  );

  const publicUrl = `${PUBLISHED_URL}/s/cert/${certificate.certificate_code}`;

  const handleTogglePublic = (checked: boolean) => {
    setPublicEnabled(checked);
    setPrivacy.mutate({
      certificateId: certificate.id,
      publicEnabled: checked,
      visibility,
    });
  };

  const handleVisibilityChange = (value: "full" | "initials" | "anon") => {
    setVisibility(value);
    setPrivacy.mutate({
      certificateId: certificate.id,
      publicEnabled,
      visibility: value,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {publicEnabled ? (
            <Globe className="h-4 w-4 text-green-600" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="public-toggle" className="font-medium">
            Link público ativo
          </Label>
        </div>
        <Switch
          id="public-toggle"
          checked={publicEnabled}
          onCheckedChange={handleTogglePublic}
          disabled={setPrivacy.isPending}
        />
      </div>

      {publicEnabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="visibility-select" className="text-sm">
              Nome no certificado público
            </Label>
            <Select
              value={visibility}
              onValueChange={handleVisibilityChange}
              disabled={setPrivacy.isPending}
            >
              <SelectTrigger id="visibility-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Nome completo</SelectItem>
                <SelectItem value="initials">Apenas iniciais (ex: J. S.)</SelectItem>
                <SelectItem value="anon">Anônimo (Voluntário #ÉLUTA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 text-xs bg-background border rounded px-2 py-1.5 text-muted-foreground truncate"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar
            </Button>
          </div>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver página pública
          </a>
        </>
      )}

      {!publicEnabled && (
        <p className="text-xs text-muted-foreground">
          Quando desativado, o link público mostrará "Certificado Privado" sem
          revelar seu nome ou detalhes.
        </p>
      )}
    </div>
  );
}
