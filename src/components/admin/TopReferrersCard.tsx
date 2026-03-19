import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface Referrer {
  user_id: string;
  user_name: string | null;
  user_city: string | null;
  invite_code: string;
  total_referrals: number;
  aprovados: number;
  referrals_7d: number;
}

export function TopReferrersCard() {
  const { user } = useAuth();

  const { data: referrers, isLoading } = useQuery({
    queryKey: ["top-referrers"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_top_referrers", {
        _limit: 10,
      });
      if (error) throw error;
      return (data as Referrer[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referrers || referrers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Quem trouxe mais gente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum referral registrado ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Quem trouxe mais gente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {referrers.map((r, i) => (
          <div
            key={r.user_id}
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg font-bold text-muted-foreground w-6 text-right">
                {i + 1}.
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.user_name || "Sem nome"}
                </p>
                {r.user_city && (
                  <p className="text-xs text-muted-foreground truncate">{r.user_city}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.referrals_7d > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{r.referrals_7d} 7d
                </Badge>
              )}
              <div className="text-right">
                <p className="text-sm font-bold">{r.total_referrals}</p>
                <p className="text-xs text-muted-foreground">
                  {r.aprovados} aprov.
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
