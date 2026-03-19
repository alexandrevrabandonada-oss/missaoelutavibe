import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, TrendingUp, ExternalLink } from "lucide-react";
import { useSharePackMetrics, PLATFORM_CONFIG } from "@/hooks/useSharePack";

interface SharePackMetricsCardProps {
  scopeTipo?: string;
  scopeId?: string | null;
  periodDays?: number;
}

export function SharePackMetricsCard({ 
  scopeTipo = 'global', 
  scopeId = null,
  periodDays = 7 
}: SharePackMetricsCardProps) {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useSharePackMetrics(scopeTipo, scopeId, periodDays);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const platformEmojis: Record<string, string> = {
    whatsapp: "💬",
    instagram_feed: "📸",
    instagram_reels: "🎬",
    tiktok: "🎵",
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Share Pack ({periodDays}d)
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {metrics.total_shares_7d} shares
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform breakdown */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(platformEmojis).map(([platform, emoji]) => (
            <div key={platform} className="text-center">
              <span className="text-lg">{emoji}</span>
              <p className="text-lg font-bold">
                {metrics.shares_by_platform[platform] || 0}
              </p>
            </div>
          ))}
        </div>

        {/* Conversion */}
        {metrics.conversion && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Share → Cadastro</span>
            </div>
            <Badge variant={metrics.conversion.rate > 0 ? "default" : "secondary"}>
              {metrics.conversion.rate}%
            </Badge>
          </div>
        )}

        {/* Top templates */}
        {metrics.top_templates && metrics.top_templates.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top Templates
            </p>
            {metrics.top_templates.slice(0, 3).map((template, idx) => (
              <div key={template.id} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">
                  {idx + 1}. {template.titulo}
                </span>
                <Badge variant="outline" className="text-xs ml-2">
                  {template.shares}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Link to Fabrica */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate("/admin/fabrica")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Ver Fábrica de Base
        </Button>
      </CardContent>
    </Card>
  );
}
