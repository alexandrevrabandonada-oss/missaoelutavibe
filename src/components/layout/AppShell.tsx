import { ReactNode } from "react";
import { SkipLink } from "./SkipLink";
import { useAppMode } from "@/hooks/useAppMode";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  const { brandStrings } = useAppMode();
  
  return (
    <div className="page-container texture-concrete">
      {/* Skip link for keyboard navigation */}
      <SkipLink />
      
      <main id="main-content" className="flex-1 flex flex-col safe-top safe-bottom" tabIndex={-1}>
        {children}
      </main>
      
      {/* Assinatura fixa */}
      <footer className="fixed bottom-0 left-0 right-0 py-3 text-center bg-gradient-to-t from-background to-transparent pointer-events-none" role="contentinfo">
        <p className="signature-luta">
          {brandStrings.signature}
        </p>
      </footer>
    </div>
  );
}
