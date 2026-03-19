import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Zap } from "lucide-react";
import { QuickAddContactModal } from "./QuickAddContactModal";
import { useQuickAddContact } from "@/hooks/useQuickAddContact";

interface QuickCaptureCardProps {
  className?: string;
}

export function QuickCaptureCard({ className }: QuickCaptureCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { openModal } = useQuickAddContact();

  const handleOpen = () => {
    openModal();
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className={`border-primary/30 bg-primary/5 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Captura Rápida</h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre um contato em 10s
                </p>
              </div>
            </div>
            <Button onClick={handleOpen} size="sm" className="gap-1">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">+ Contato</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuickAddContactModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        origem="manual"
      />
    </>
  );
}
