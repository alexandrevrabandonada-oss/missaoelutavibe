import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { useTopContentWeek, CONTENT_SIGNAL_CONFIG } from "@/hooks/useContentSignals";
import { Skeleton } from "@/components/ui/skeleton";

interface TopContentCardProps {
  type?: string;
  limit?: number;
  title?: string;
}

export function TopContentCard({
  type,
  limit = 5,
  title = "Top da Semana",
}: TopContentCardProps) {
  const { data: topContent, isLoading } = useTopContentWeek(type, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!topContent?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum conteúdo com reações esta semana
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topContent.map((item, index) => (
          <div
            key={item.content_id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="text-lg font-bold text-muted-foreground w-6 text-center">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">{item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.total_signals} reações • {item.unique_users} pessoas
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                {Object.entries(CONTENT_SIGNAL_CONFIG).map(([signal, { emoji }]) => {
                  const count = item[`${signal}_count` as keyof typeof item] as number;
                  if (!count) return null;
                  return (
                    <span key={signal} className="text-xs">
                      {emoji} {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
