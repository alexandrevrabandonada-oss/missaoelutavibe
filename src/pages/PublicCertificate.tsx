/**
 * Public Certificate Verification Page
 * Route: /s/cert/:code
 */
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Award,
  CheckCircle2,
  Copy,
  MessageCircle,
  ShieldX,
  ShieldOff,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";
import { usePublicCertificate } from "@/hooks/useCertificates";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";
import { useEffect, useRef } from "react";
import { buildCertShareUrl, openWhatsAppShare, copyToClipboard } from "@/lib/shareUtils";

import { PUBLISHED_URL } from "@/lib/shareUtils";
const OG_DEFAULT_IMAGE = "/og-default.png";

export default function PublicCertificate() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = usePublicCertificate(code);
  const logEvent = useLogGrowthEvent();
  const { inviteCode } = usePersonalInviteCode();
  const hasLoggedView = useRef(false);

  // Track view once
  useEffect(() => {
    if (!isLoading && data && !hasLoggedView.current) {
      hasLoggedView.current = true;
      logEvent.mutate({
        eventType: "certificate_viewed",
        meta: { stage: "public", status: data.status },
      });
    }
  }, [isLoading, data, logEvent]);

  const publicUrl = code ? buildCertShareUrl(code, inviteCode) : "";

  const handleCopyLink = async () => {
    await copyToClipboard(publicUrl);
    toast.success("Link copiado!");
    logEvent.mutate({
      eventType: "certificate_shared",
      meta: { stage: "public_link" },
    });
  };

  const handleShareWhatsApp = () => {
    const text = `🎓 Certificado verificado!\n\n${data?.course_title || "Formação"} — Missão #ÉLUTA\n\n${publicUrl}`;
    openWhatsAppShare(text);
    logEvent.mutate({
      eventType: "certificate_shared",
      meta: { stage: "public_whatsapp" },
    });
  };

  // OG meta values
  const ogTitle = data?.status === "valid" 
    ? `Certificado #ÉLUTA — ${data.course_title}` 
    : "Verificação de Certificado — Missão #ÉLUTA";
  const ogDescription = data?.status === "valid"
    ? `Certificado verificado de ${data.display_name}`
    : "Verificação pública de certificado de formação.";
  const ogImage = data?.og_image_url || `${PUBLISHED_URL}${OG_DEFAULT_IMAGE}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Verificando Certificado... — Missão #ÉLUTA</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data || !data.ok) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Certificado não encontrado — Missão #ÉLUTA</title>
          <meta property="og:title" content="Certificado não encontrado — Missão #ÉLUTA" />
          <meta property="og:description" content="Este código de certificado não foi encontrado." />
          <meta property="og:image" content={`${PUBLISHED_URL}${OG_DEFAULT_IMAGE}`} />
        </Helmet>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto p-3 bg-muted rounded-full w-fit mb-4">
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Código não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              O código <strong>{code}</strong> não corresponde a nenhum certificado registrado.
            </p>
            <Link to="/comecar">
              <Button variant="outline" className="w-full">
                Conhecer o Missão #ÉLUTA
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <div className="mt-8">
          <Logo size="sm" />
        </div>
      </div>
    );
  }

  // Private certificate
  if (data.status === "private") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Certificado Privado — Missão #ÉLUTA</title>
          <meta property="og:title" content="Certificado Privado — Missão #ÉLUTA" />
          <meta property="og:description" content="Este certificado não está público." />
          <meta property="og:image" content={`${PUBLISHED_URL}${OG_DEFAULT_IMAGE}`} />
        </Helmet>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto p-3 bg-muted rounded-full w-fit mb-4">
              <ShieldOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Certificado Privado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              O voluntário optou por manter este certificado privado.
            </p>
            <Link to="/comecar">
              <Button variant="outline" className="w-full">
                Conhecer o Missão #ÉLUTA
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <div className="mt-8">
          <Logo size="sm" />
        </div>
      </div>
    );
  }

  // Revoked certificate
  if (data.status === "revoked") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Certificado Revogado — Missão #ÉLUTA</title>
          <meta property="og:title" content="Certificado Revogado — Missão #ÉLUTA" />
          <meta property="og:description" content="Este certificado foi revogado." />
          <meta property="og:image" content={`${PUBLISHED_URL}${OG_DEFAULT_IMAGE}`} />
        </Helmet>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto p-3 bg-destructive/10 rounded-full w-fit mb-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Certificado Revogado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Este certificado foi revogado e não é mais válido.
            </p>
            {data.course_title && (
              <p className="text-sm text-muted-foreground">
                Curso: {data.course_title}
              </p>
            )}
            <Link to="/comecar">
              <Button variant="outline" className="w-full">
                Conhecer o Missão #ÉLUTA
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <div className="mt-8">
          <Logo size="sm" />
        </div>
      </div>
    );
  }

  // Valid certificate
  const issuedDate = data.issued_at 
    ? format(new Date(data.issued_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={publicUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-green-500/10 rounded-full w-fit mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <Badge variant="default" className="bg-green-600 mb-2 mx-auto">
            <Award className="h-3 w-3 mr-1" />
            CERTIFICADO VERIFICADO
          </Badge>
          <CardTitle className="text-xl">{data.course_title}</CardTitle>
          {data.course_level && (
            <p className="text-sm text-muted-foreground">
              Nível: {data.course_level}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-primary">
              {data.display_name}
            </p>
            {issuedDate && (
              <p className="text-sm text-muted-foreground">
                Concluído em {issuedDate}
              </p>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
            <Button
              variant="default"
              className="w-full"
              onClick={handleShareWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Compartilhar no WhatsApp
            </Button>
          </div>

          <div className="border-t pt-4">
            <Link to="/comecar">
              <Button variant="ghost" className="w-full text-muted-foreground">
                Conhecer o Missão #ÉLUTA
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Logo size="sm" />
        <p className="text-xs text-muted-foreground mt-2">
          Código: {code?.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
