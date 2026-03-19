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
import { Trash2 } from "lucide-react";
import { useCRMPrivacy } from "@/hooks/useCRMPrivacy";

interface DeleteContactDialogProps {
  contactId: string;
  contactName: string;
  onDeleted?: () => void;
}

export function DeleteContactDialog({
  contactId,
  contactName,
  onDeleted,
}: DeleteContactDialogProps) {
  const { deleteContact } = useCRMPrivacy();

  const handleDelete = async () => {
    const result = await deleteContact.mutateAsync(contactId);
    if (result.ok) {
      onDeleted?.();
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir <strong>{contactName}</strong>. 
            Os dados pessoais (WhatsApp, telefone, email) serão apagados 
            permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteContact.isPending}
          >
            {deleteContact.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
