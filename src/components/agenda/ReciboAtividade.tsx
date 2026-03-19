import { ReciboAtividade as ReciboType } from "@/hooks/useAtividades";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, ArrowRight, Link as LinkIcon } from "lucide-react";

interface ReciboAtividadeProps {
  recibo: ReciboType;
  className?: string;
}

export function ReciboAtividade({ recibo, className }: ReciboAtividadeProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-primary" />
        <span className="text-sm uppercase tracking-wider font-bold text-primary">
          Recibo da Atividade
        </span>
        <Badge variant="secondary" className="ml-auto">Concluída</Badge>
      </div>

      <div className="space-y-4">
        {/* Resumo */}
        {recibo.resumo && (
          <div>
            <h4 className="text-xs uppercase text-muted-foreground mb-1">Resumo</h4>
            <p className="text-sm whitespace-pre-wrap">{recibo.resumo}</p>
          </div>
        )}

        {/* Feitos */}
        {recibo.feitos && (
          <div>
            <h4 className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              O que foi feito
            </h4>
            <p className="text-sm whitespace-pre-wrap">{recibo.feitos}</p>
          </div>
        )}

        {/* Próximos passos */}
        {recibo.proximos_passos && (
          <div>
            <h4 className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              Próximos passos
            </h4>
            <p className="text-sm whitespace-pre-wrap">{recibo.proximos_passos}</p>
          </div>
        )}

        {/* Links */}
        {recibo.links && recibo.links.length > 0 && (
          <div>
            <h4 className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              Links
            </h4>
            <div className="flex flex-wrap gap-2">
              {recibo.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
