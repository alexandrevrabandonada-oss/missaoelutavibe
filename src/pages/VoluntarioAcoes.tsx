/**
 * VoluntarioAcoes - Full action queue page
 * Route: /voluntario/acoes
 */

import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { focusRingClass } from "@/utils/a11y";
import { ActionQueueList } from "@/components/actions/ActionQueueList";

export default function VoluntarioAcoes() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={focusRingClass()}
            aria-label="Voltar para Hoje"
          >
            <Link to="/voluntario/hoje">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Fila de Ações</h1>
            <p className="text-muted-foreground">
              Todas as suas ações pendentes, ordenadas por prioridade
            </p>
          </div>
        </div>

        {/* Full List */}
        <ActionQueueList />
      </div>
    </AppShell>
  );
}
