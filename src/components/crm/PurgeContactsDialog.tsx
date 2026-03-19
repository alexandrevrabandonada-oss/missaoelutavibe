import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useCRMPrivacy } from "@/hooks/useCRMPrivacy";

interface PurgeContactsDialogProps {
  totalContacts: number;
  onPurged?: () => void;
}

export function PurgeContactsDialog({
  totalContacts,
  onPurged,
}: PurgeContactsDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const { purgeContacts } = useCRMPrivacy();

  const confirmRequired = "EXCLUIR TUDO";
  const isConfirmed = confirmText === confirmRequired;

  const handlePurge = async () => {
    if (!isConfirmed) return;
    
    const result = await purgeContacts.mutateAsync();
    if (result.ok) {
      setConfirmText("");
      onPurged?.();
    }
  };

  if (totalContacts === 0) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/50">
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir todos meus contatos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ Excluir TODOS os contatos?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Você está prestes a excluir <strong>{totalContacts} contatos</strong> 
              que você registrou. Todos os dados pessoais (WhatsApp, telefone, email) 
              serão apagados permanentemente.
            </p>
            <p className="font-medium">
              Esta ação é irreversível e não pode ser desfeita.
            </p>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Digite <strong>{confirmRequired}</strong> para confirmar:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmRequired}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePurge}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!isConfirmed || purgeContacts.isPending}
          >
            {purgeContacts.isPending ? "Excluindo..." : "Confirmar exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
