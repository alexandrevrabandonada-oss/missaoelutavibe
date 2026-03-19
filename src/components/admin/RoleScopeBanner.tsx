import { Shield } from "lucide-react";
import { useRoleManagement } from "@/hooks/useRoleManagement";

export function RoleScopeBanner() {
  const { currentRoleLabel, isRoleLabelLoading } = useRoleManagement();

  if (isRoleLabelLoading) {
    return null;
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 text-primary">
        <Shield className="h-4 w-4" />
        <span className="text-sm font-medium">Você está operando como:</span>
        <span className="font-bold">{currentRoleLabel}</span>
      </div>
    </div>
  );
}
