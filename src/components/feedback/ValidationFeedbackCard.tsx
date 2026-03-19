import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Send, 
  Share2,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import { useValidationFeedback, ValidationFeedbackItem, REJECTION_REASON_LABELS } from "@/hooks/useValidationFeedback";
import { useWeeklySharePack } from "@/hooks/useWeeklySharePack";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ValidationFeedbackCardProps {
  compact?: boolean;
  maxItems?: number;
}

export function ValidationFeedbackCard({ compact = false, maxItems = 3 }: ValidationFeedbackCardProps) {
  const { 
    items, 
    hasItems, 
    isLoading, 
    trackView, 
    trackOpen,
    trackResubmitClick,
  } = useValidationFeedback(maxItems);
  
  const weeklyShare = useWeeklySharePack();
  const [expanded, setExpanded] = useState(false);

  // Track view on mount
  useEffect(() => {
    if (hasItems) {
      trackView();
    }
  }, [hasItems, trackView]);

  if (isLoading || !hasItems) {
    return null;
  }

  const displayItems = expanded ? items : items.slice(0, 2);

  const handleItemClick = (item: ValidationFeedbackItem) => {
    trackOpen(item.status);
  };

  const handleResubmit = (item: ValidationFeedbackItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackResubmitClick(item.reason_code);
  };

  const handleShare = async () => {
    await weeklyShare.shareNative();
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (compact) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Feedbacks recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayItems.map((item) => (
            <FeedbackItem 
              key={item.evidence_id} 
              item={item} 
              compact 
              onClick={() => handleItemClick(item)}
              onResubmit={handleResubmit}
              onShare={handleShare}
              shareEligible={weeklyShare.shouldShowBanner}
            />
          ))}
          
          {items.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Ver mais ({items.length - 2})
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Feedbacks de Validação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <FeedbackItem 
            key={item.evidence_id} 
            item={item} 
            onClick={() => handleItemClick(item)}
            onResubmit={handleResubmit}
            onShare={handleShare}
            shareEligible={weeklyShare.shouldShowBanner}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface FeedbackItemProps {
  item: ValidationFeedbackItem;
  compact?: boolean;
  onClick: () => void;
  onResubmit: (item: ValidationFeedbackItem, e: React.MouseEvent) => void;
  onShare: () => void;
  shareEligible: boolean;
}

function FeedbackItem({ item, compact, onClick, onResubmit, onShare, shareEligible }: FeedbackItemProps) {
  const isApproved = item.status === "validado";
  
  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (compact) {
    return (
      <Link 
        to={item.href}
        onClick={onClick}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        {isApproved ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {isApproved ? "✅ Aprovada" : "⚠️ Ajuste necessário"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {item.mission_title}
          </p>
        </div>
        {isApproved && shareEligible ? (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 px-2 text-xs"
            onClick={(e) => { e.preventDefault(); onShare(); }}
          >
            <Share2 className="h-3 w-3" />
          </Button>
        ) : !isApproved ? (
          <Link 
            to={`/voluntario/evidencia/${item.mission_id}?reason=${item.reason_code || ''}`}
            onClick={(e) => onResubmit(item, e)}
          >
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
              <Send className="h-3 w-3" />
              Reenviar
            </Button>
          </Link>
        ) : (
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Link>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${isApproved ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
      <div className="flex items-start gap-3">
        {isApproved ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">
              {isApproved ? "Evidência aprovada!" : "Ajuste necessário"}
            </p>
            <span className="text-xs text-muted-foreground">
              {formatTime(item.validated_at)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {item.mission_title}
          </p>
          
          {!isApproved && item.reason_code && (
            <Badge variant="secondary" className="mb-2">
              {REJECTION_REASON_LABELS[item.reason_code] || item.reason_code}
            </Badge>
          )}
          
          {!isApproved && item.reason_text && (
            <p className="text-sm text-muted-foreground mb-2 italic">
              "{item.reason_text}"
            </p>
          )}

          <div className="flex gap-2 mt-2">
            {isApproved ? (
              <>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link to={item.href}>
                    Ver <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                {shareEligible && (
                  <Button size="sm" variant="ghost" className="gap-1" onClick={onShare}>
                    <Share2 className="h-3 w-3" />
                    Compartilhar
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button asChild size="sm" className="gap-1">
                  <Link 
                    to={`/voluntario/evidencia/${item.mission_id}?reason=${item.reason_code || ''}`}
                    onClick={(e) => onResubmit(item, e as any)}
                  >
                    <Send className="h-4 w-4" />
                    Reenviar evidência
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link to={item.href}>
                    Ver motivo <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
