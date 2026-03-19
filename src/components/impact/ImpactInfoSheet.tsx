/**
 * ImpactInfoSheet - Explains how impact translates to votes
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Zap, Users, MessageCircle, UserPlus } from "lucide-react";

interface ImpactInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IMPACT_EXPLANATIONS = [
  {
    icon: Zap,
    title: "Ação diária = presença",
    description: "Cada ação mostra que estamos ativos no território, criando visibilidade constante.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Contato salvo = base real",
    description: "Pessoas reais que podemos mobilizar. Quanto mais, mais forte nossa rede.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: MessageCircle,
    title: "Follow-up = confiança",
    description: "Manter contato cria relacionamento. Quem confia, participa e vota.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: UserPlus,
    title: "Convite = crescimento",
    description: "Cada pessoa que entra multiplica nosso alcance. Crescemos juntos.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function ImpactInfoSheet({ open, onOpenChange }: ImpactInfoSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Como isso vira voto?</SheetTitle>
          <SheetDescription>
            Entenda em 20 segundos como suas ações constroem a vitória
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {IMPACT_EXPLANATIONS.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-full ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Pequenas ações diárias criam grandes mudanças. Continue fazendo sua parte.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
