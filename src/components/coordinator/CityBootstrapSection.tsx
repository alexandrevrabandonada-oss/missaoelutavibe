/**
 * CityBootstrapSection - City activation with default cells kit
 * 
 * Allows COORD_GLOBAL and COORD_CITY to activate a city with Kit v0 cells.
 * Part of P1: City Bootstrap.
 * 
 * P4/P5: Now also creates playbooks and initial mural posts for each cell.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCellOpsMutations, type CityCell } from "@/hooks/useCellOps";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultPlaybook, generateWelcomePost } from "@/lib/cellPlaybook";
import {
  Building2,
  Check,
  Eye,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
} from "lucide-react";

// Kit v0 - Default cells for new cities
const KIT_V0_CELLS = [
  { name: "Geral", notes: "Célula padrão para voluntários sem alocação específica", tags: ["inicial", "geral"] },
  { name: "Rua & Escuta", notes: "Ações de rua, panfletagem, escuta ativa", tags: ["rua", "escuta"] },
  { name: "Comunicação", notes: "Redes sociais, materiais, divulgação", tags: ["comunicacao", "digital"] },
  { name: "Formação", notes: "Capacitação, cursos, multiplicadores", tags: ["formacao", "educacao"] },
  { name: "CRM & Base", notes: "Gestão de contatos, follow-ups, apoio", tags: ["crm", "base"] },
];
 
 interface CityBootstrapSectionProps {
   cityId: string;
   cityName: string;
   existingCells: CityCell[];
   isLoadingCells: boolean;
 }
 
export function CityBootstrapSection({ 
  cityId, 
  cityName, 
  existingCells, 
  isLoadingCells 
}: CityBootstrapSectionProps) {
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showKitView, setShowKitView] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationProgress, setActivationProgress] = useState(0);
  
  const { upsertCell } = useCellOpsMutations();

  // Check if city already has cells
  const hasCells = existingCells.length > 0;
  
  // Check if Kit v0 cells exist
  const kitCellNames = KIT_V0_CELLS.map(c => c.name.toLowerCase());
  const existingKitCells = existingCells.filter(c => 
    kitCellNames.includes(c.name.toLowerCase())
  );
  const hasFullKit = existingKitCells.length >= KIT_V0_CELLS.length;
 
  // Activate city with Kit v0
  const handleActivate = async () => {
    setShowConfirm(false);
    setIsActivating(true);
    setActivationProgress(0);

    try {
      for (let i = 0; i < KIT_V0_CELLS.length; i++) {
        const cellDef = KIT_V0_CELLS[i];
        
        // Check if this cell already exists
        const existingCell = existingCells.find(c => 
          c.name.toLowerCase() === cellDef.name.toLowerCase()
        );

        if (!existingCell) {
          // Create cell
          await new Promise<void>((resolve, reject) => {
            upsertCell({
              cityId,
              name: cellDef.name,
              notes: cellDef.notes,
              tags: cellDef.tags,
            }, {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            });
          });

          // Get the newly created cell to update playbook and create post
          const { data: newCell } = await supabase
            .from("cells")
            .select("id")
            .eq("cidade_id", cityId)
            .ilike("name", cellDef.name)
            .maybeSingle();

          if (newCell) {
            // Update cell with playbook
            const playbook = getDefaultPlaybook(cellDef.name);
            if (playbook) {
              await supabase
                .from("cells")
                .update({ 
                  meta_json: JSON.parse(JSON.stringify({ playbook }))
                })
                .eq("id", newCell.id);
            }

            // Create welcome post in mural
            const welcomeText = generateWelcomePost(cellDef.name);
            await supabase
              .from("mural_posts")
              .insert({
                autor_user_id: user?.id,
                escopo_tipo: "celula",
                escopo_id: newCell.id,
                tipo: "texto",
                titulo: `Bem-vindo à célula ${cellDef.name}`,
                corpo_markdown: welcomeText,
                status: "publicado",
              });
          }
        }

        setActivationProgress(((i + 1) / KIT_V0_CELLS.length) * 100);
      }

      toast.success(`Cidade ${cityName} ativada com ${KIT_V0_CELLS.length} células + playbooks!`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar cidade");
    } finally {
      setIsActivating(false);
      setActivationProgress(0);
    }
  };
 
   if (isLoadingCells) {
     return null;
   }
 
   return (
     <>
       <Card className={!hasCells ? "border-primary border-dashed" : ""}>
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Rocket className="h-4 w-4 text-primary" />
               <CardTitle className="text-base">Kit Inicial de Células</CardTitle>
             </div>
             {hasFullKit && (
               <Badge variant="outline" className="text-green-600 border-green-500">
                 <Check className="h-3 w-3 mr-1" />
                 Kit v0 completo
               </Badge>
             )}
           </div>
           <CardDescription>
             {!hasCells 
               ? `Ative ${cityName} criando as ${KIT_V0_CELLS.length} células padrão`
               : hasFullKit
                 ? "Cidade já possui todas as células do Kit v0"
                 : `${existingKitCells.length}/${KIT_V0_CELLS.length} células do Kit v0 criadas`
             }
           </CardDescription>
         </CardHeader>
 
         <CardContent className="space-y-4">
           {/* Kit preview */}
           {(showKitView || !hasCells) && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
               {KIT_V0_CELLS.map((cell) => {
                 const exists = existingCells.some(c => 
                   c.name.toLowerCase() === cell.name.toLowerCase()
                 );
                 return (
                   <div 
                     key={cell.name}
                     className={`p-3 rounded-lg border ${
                       exists 
                         ? "bg-green-500/5 border-green-500/30" 
                         : "bg-muted/30 border-dashed"
                     }`}
                   >
                     <div className="flex items-center gap-2 mb-1">
                       {exists ? (
                         <Check className="h-4 w-4 text-green-600" />
                       ) : (
                         <Building2 className="h-4 w-4 text-muted-foreground" />
                       )}
                       <span className="font-medium text-sm">{cell.name}</span>
                     </div>
                     <p className="text-xs text-muted-foreground line-clamp-2">
                       {cell.notes}
                     </p>
                   </div>
                 );
               })}
             </div>
           )}
 
           {/* Progress bar during activation */}
           {isActivating && (
             <div className="space-y-2">
               <div className="flex items-center gap-2">
                 <Loader2 className="h-4 w-4 animate-spin text-primary" />
                 <span className="text-sm">Criando células...</span>
               </div>
               <div className="w-full bg-muted rounded-full h-2">
                 <div 
                   className="bg-primary h-2 rounded-full transition-all duration-300"
                   style={{ width: `${activationProgress}%` }}
                 />
               </div>
             </div>
           )}
 
           {/* Actions */}
           <div className="flex flex-wrap gap-2">
             {!hasCells ? (
               <Button 
                 onClick={() => setShowConfirm(true)} 
                 disabled={isActivating}
                 className="gap-2"
               >
                 <Sparkles className="h-4 w-4" />
                 Ativar cidade com Kit v0
               </Button>
             ) : hasFullKit ? (
               <Button 
                 variant="outline" 
                 onClick={() => setShowKitView(!showKitView)}
                 className="gap-2"
               >
                 <Eye className="h-4 w-4" />
                 {showKitView ? "Ocultar kit" : "Ver kit"}
               </Button>
             ) : (
               <>
                 <Button 
                   onClick={() => setShowConfirm(true)} 
                   disabled={isActivating}
                   variant="outline"
                   className="gap-2"
                 >
                   <Plus className="h-4 w-4" />
                   Completar Kit v0
                 </Button>
                 <Button 
                   variant="ghost" 
                   onClick={() => setShowKitView(!showKitView)}
                   className="gap-2"
                 >
                   <Eye className="h-4 w-4" />
                   {showKitView ? "Ocultar" : "Ver kit"}
                 </Button>
               </>
             )}
           </div>
         </CardContent>
       </Card>
 
       {/* Confirmation dialog */}
       <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>
               {!hasCells ? "Ativar cidade?" : "Completar Kit v0?"}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {!hasCells ? (
                 <>
                   Serão criadas <strong>{KIT_V0_CELLS.length} células</strong> para{" "}
                   <strong>{cityName}</strong>:
                   <ul className="mt-2 space-y-1 list-disc list-inside">
                     {KIT_V0_CELLS.map(c => (
                       <li key={c.name}>{c.name}</li>
                     ))}
                   </ul>
                 </>
               ) : (
                 <>
                   Serão criadas as células faltantes do Kit v0 para{" "}
                   <strong>{cityName}</strong>:
                   <ul className="mt-2 space-y-1 list-disc list-inside">
                     {KIT_V0_CELLS.filter(c => 
                       !existingCells.some(ec => 
                         ec.name.toLowerCase() === c.name.toLowerCase()
                       )
                     ).map(c => (
                       <li key={c.name}>{c.name}</li>
                     ))}
                   </ul>
                 </>
               )}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleActivate}>
               Confirmar
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }