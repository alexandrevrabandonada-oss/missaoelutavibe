import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, UserPlus, CheckSquare, Target, Share2, MessageCircle, BarChart3, ExternalLink } from "lucide-react";

const STEPS = [
  {
    num: 1,
    label: "Criar conta teste",
    desc: "Abra aba anônima e crie uma conta nova para simular voluntário",
    icon: UserPlus,
    path: "/auth",
    external: true,
  },
  {
    num: 2,
    label: "Fazer check-in",
    desc: "Acesse /voluntario/hoje e faça o check-in diário",
    icon: CheckSquare,
    path: "/voluntario/hoje",
  },
  {
    num: 3,
    label: "Fazer missão do dia",
    desc: "Aceite e conclua uma missão na vitrine",
    icon: Target,
    path: "/voluntario/missoes",
  },
  {
    num: 4,
    label: "Compartilhar material",
    desc: "Navegue à Base e compartilhe 1 material (WhatsApp ou Copiar)",
    icon: Share2,
    path: "/voluntario/base?pilot_share=1",
  },
  {
    num: 5,
    label: "Enviar convite WhatsApp",
    desc: "Verifique se o CTA de convite aparece após compartilhar",
    icon: MessageCircle,
    path: "/voluntario/hoje",
  },
  {
    num: 6,
    label: "Ver refletido no painel",
    desc: "Abra o Painel do Piloto e confira se os dados refletem",
    icon: BarChart3,
    path: "/admin/piloto",
  },
] as const;

export function PilotTestChecklistCard() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Checklist de Teste Rápido — Piloto
        </CardTitle>
        <CardDescription>
          Siga os 6 passos abaixo para validar o fluxo completo do modo piloto sem dados reais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
            >
              <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {step.num}
              </span>
              <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if ("external" in step && step.external) {
                    window.open(step.path, "_blank");
                  } else {
                    navigate(step.path);
                  }
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ir
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
