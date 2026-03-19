import { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Download, Share2, QrCode, Link2 } from "lucide-react";

interface TerritoryLinkQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cidade: {
    id: string;
    nome: string;
    slug: string;
    uf: string;
  };
  userInviteCode?: string;
}

const UTM_SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "panfleto", label: "Panfleto/QR Físico" },
  { value: "evento", label: "Evento Presencial" },
  { value: "outro", label: "Outro" },
];

export function TerritoryLinkQRModal({
  open,
  onOpenChange,
  cidade,
  userInviteCode,
}: TerritoryLinkQRModalProps) {
  const [includeRef, setIncludeRef] = useState(!!userInviteCode);
  const [utmSource, setUtmSource] = useState("");
  const [customCampaign, setCustomCampaign] = useState("");

  // Generate the link
  const generatedLink = useMemo(() => {
    const baseUrl = `${window.location.origin}/r/${cidade.slug}`;
    const params = new URLSearchParams();
    
    params.set("cidade", cidade.nome);
    
    if (includeRef && userInviteCode) {
      params.set("ref", userInviteCode);
    }
    
    if (utmSource) {
      params.set("utm_source", utmSource);
      params.set("utm_medium", "territory_link");
      if (customCampaign) {
        params.set("utm_campaign", customCampaign.toLowerCase().replace(/\s+/g, "-"));
      } else {
        params.set("utm_campaign", cidade.slug);
      }
    }
    
    return `${baseUrl}?${params.toString()}`;
  }, [cidade, includeRef, userInviteCode, utmSource, customCampaign]);

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copiado!");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Missão ÉLuta - ${cidade.nome}`,
          text: `Junte-se à Missão ÉLuta em ${cidade.nome}! Sua primeira missão em 10 minutos.`,
          url: generatedLink,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("territory-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    canvas.width = 512;
    canvas.height = 512;
    
    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const link = document.createElement("a");
      link.download = `qr-${cidade.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    toast.success("QR Code baixado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Link & QR Code - {cidade.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Options */}
          <div className="space-y-3">
            {userInviteCode && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <Label className="text-sm font-medium">Incluir meu código de convite</Label>
                  <p className="text-xs text-muted-foreground">Rastreia como sua indicação</p>
                </div>
                <input
                  type="checkbox"
                  checked={includeRef}
                  onChange={(e) => setIncludeRef(e.target.checked)}
                  className="h-5 w-5 rounded border-border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Origem do link</Label>
              <Select value={utmSource} onValueChange={setUtmSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Onde vai usar?" />
                </SelectTrigger>
                <SelectContent>
                  {UTM_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {utmSource && (
              <div className="space-y-2">
                <Label>Campanha (opcional)</Label>
                <Input
                  placeholder="Ex: mutirao-janeiro"
                  value={customCampaign}
                  onChange={(e) => setCustomCampaign(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Generated Link */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link Gerado
            </Label>
            <div className="flex gap-2">
              <Input
                value={generatedLink}
                readOnly
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg">
            <QRCodeSVG
              id="territory-qr-code"
              value={generatedLink}
              size={200}
              level="M"
              includeMargin
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
            <Badge variant="outline" className="text-xs">
              {cidade.nome} - {cidade.uf}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={downloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Baixar QR
            </Button>
            <Button className="flex-1" onClick={shareLink}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            O link abre na página de cadastro com a cidade pré-preenchida.
            {includeRef && " Novos cadastros serão atribuídos a você."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
