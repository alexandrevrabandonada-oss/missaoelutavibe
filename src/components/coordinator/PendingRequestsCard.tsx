 /**
  * PendingRequestsCard - Shows pending assignment requests count with CTA
  * For /coordenador/hoje cockpit
  */
 
 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Skeleton } from "@/components/ui/skeleton";
 import { usePendingRequestsCount } from "@/hooks/useCellAssignmentRequest";
 import { Users, ArrowRight, CheckCircle2 } from "lucide-react";
 
 interface PendingRequestsCardProps {
   cityId?: string | null;
   cityName?: string | null;
 }
 
 export function PendingRequestsCard({ cityId, cityName }: PendingRequestsCardProps) {
   const { data: count, isLoading, error } = usePendingRequestsCount(cityId);
 
   if (isLoading) {
     return <Skeleton className="h-32" />;
   }
 
   if (error) {
     return (
       <Card className="border-destructive/50">
         <CardContent className="py-6 text-center text-muted-foreground text-sm">
           Erro ao carregar pendências
         </CardContent>
       </Card>
     );
   }
 
   const hasPending = (count || 0) > 0;
 
   return (
     <Card className={hasPending ? "border-primary/50 bg-primary/5" : ""}>
       <CardHeader className="pb-2">
         <CardTitle className="text-base flex items-center justify-between">
           <span className="flex items-center gap-2">
             <Users className="h-4 w-4 text-primary" />
             Pedidos de Alocação
           </span>
           {hasPending && (
             <Badge variant="default" className="animate-pulse">
               {count}
             </Badge>
           )}
         </CardTitle>
         <CardDescription className="text-xs">
           {cityName ? `Cidade: ${cityName}` : "Todas as cidades"}
         </CardDescription>
       </CardHeader>
 
       <CardContent className="space-y-3">
         {hasPending ? (
           <>
             <p className="text-sm">
               <strong>{count}</strong> voluntário(s) aguardando triagem
             </p>
             <Button asChild size="sm" className="w-full">
               <Link to="/coordenador/territorio?tab=requests">
                 Ir para Triagem
                 <ArrowRight className="h-4 w-4 ml-2" />
               </Link>
             </Button>
           </>
         ) : (
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <CheckCircle2 className="h-4 w-4 text-green-500" />
             Nenhum pedido pendente
           </div>
         )}
       </CardContent>
     </Card>
   );
 }