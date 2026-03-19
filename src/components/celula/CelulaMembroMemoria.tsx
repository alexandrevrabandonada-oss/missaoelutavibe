/**
 * CelulaMembroMemoria - Tab "Memória" for cell member
 * F5.3: Polished hierarchy, copy, empty states
 * 
 * Two sections:
 * 1. Sua trajetória — personal validated records
 * 2. Conquistas da célula — collective cycle history
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCelulaMembroMemoria } from "@/hooks/useCelulaMembroMemoria";
import { RegistroValidadoCard } from "./RegistroValidadoCard";
import { CicloCelulaCard } from "./CicloCelulaCard";
import { Award, BookOpen, CheckCircle2, Flame, Footprints } from "lucide-react";

interface Props {
  cellId: string;
}

export function CelulaMembroMemoria({ cellId }: Props) {
  const { registros, isLoadingRegistros, ciclos, isLoadingCiclos } = useCelulaMembroMemoria(cellId);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <p className="text-xs text-muted-foreground -mb-4">
        Histórico de registros validados e ciclos encerrados
      </p>

      {/* ─── Section 1: Personal trajectory ─── */}
      <section>
        <div className="mb-4">
          <h3 className="heading-luta text-sm flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" />
            Sua trajetória
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">
            Cada registro validado é prova do seu compromisso
          </p>
        </div>

        {isLoadingRegistros ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : registros.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 px-4 text-center">
            <Flame className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Nenhum registro validado ainda
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
              Quando suas missões forem validadas pela coordenação, seus recibos aparecerão aqui como parte da sua trajetória
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {registros.map((r) => (
                <RegistroValidadoCard key={r.id} registro={r} />
              ))}
            </div>
            {registros.length >= 3 && (
              <p className="text-[10px] text-muted-foreground/40 text-center mt-3 uppercase tracking-wider">
                {registros.length} registros validados — é luta!
              </p>
            )}
          </>
        )}
      </section>

      {/* ─── Divider ─── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold">
          coletivo
        </span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* ─── Section 2: Collective conquests ─── */}
      <section>
        <div className="mb-4">
          <h3 className="heading-luta text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Conquistas da célula
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">
            O que construímos juntos, ciclo a ciclo
          </p>
        </div>

        {isLoadingCiclos ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : ciclos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 px-4 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Nenhum ciclo encerrado ainda
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
              A memória coletiva da célula será construída conforme os ciclos forem concluídos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ciclos.map((ciclo) => (
              <CicloCelulaCard key={ciclo.id} ciclo={ciclo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
