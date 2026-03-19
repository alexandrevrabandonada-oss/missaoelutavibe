/**
 * TodayStack - Unified module renderer for /voluntario/hoje
 * 
 * Renders up to 3 primary modules with a "Ver mais" bottom sheet
 * for additional modules. Supports dismissals and tracking.
 */

import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, MoreHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useTodayOrchestrator,
  TodayModuleKey,
  TodayModule,
} from "@/hooks/useTodayOrchestrator";
import { focusRingClass } from "@/utils/a11y";

// Props for building modules
interface ModuleConfig {
  key: TodayModuleKey;
  component: ReactNode;
  visible?: boolean;
  dismissible?: boolean;
  reason?: string;
  title?: string;
  priorityOverride?: number;
}

interface TodayStackProps {
  modules: ModuleConfig[];
  maxPrimary?: number;
  className?: string;
}

export function TodayStack({
  modules,
  maxPrimary = 3,
  className = "",
}: TodayStackProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { 
    primary, 
    more, 
    dismissModule, 
    hasMore, 
    moreCount,
    trackMoreOpened,
  } = useTodayOrchestrator(modules, { maxPrimary });

  // Track when sheet is opened
  const handleSheetOpen = (open: boolean) => {
    setSheetOpen(open);
    if (open && moreCount > 0) {
      trackMoreOpened(moreCount);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary modules (up to maxPrimary) */}
      {primary.map((module) => (
        <TodayModuleWrapper
          key={module.key}
          module={module}
          onDismiss={module.dismissible ? () => dismissModule(module.key) : undefined}
        />
      ))}

      {/* "Ver mais" button with bottom sheet */}
      {hasMore && (
        <Sheet open={sheetOpen} onOpenChange={handleSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-between ${focusRingClass()}`}
            >
              <span className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Ver mais ({moreCount})
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader className="pb-4">
              <SheetTitle>Mais opções para hoje</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4 pb-8">
                {more.map((module, index) => (
                  <div key={module.key}>
                    <TodayModuleWrapper
                      module={module}
                      onDismiss={
                        module.dismissible ? () => dismissModule(module.key) : undefined
                      }
                      inSheet
                    />
                    {index < more.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

// Wrapper for individual modules with dismiss support
interface TodayModuleWrapperProps {
  module: TodayModule;
  onDismiss?: () => void;
  inSheet?: boolean;
}

function TodayModuleWrapper({
  module,
  onDismiss,
  inSheet = false,
}: TodayModuleWrapperProps) {
  return (
    <div className="relative group">
      {/* Dismiss button (only for dismissible modules) */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`absolute -top-2 -right-2 z-10 p-1 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity ${
            inSheet ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } ${focusRingClass()}`}
          aria-label="Agora não"
          title="Agora não (voltar amanhã)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Module content */}
      {module.component}
    </div>
  );
}

// Export for type usage
export type { ModuleConfig };
