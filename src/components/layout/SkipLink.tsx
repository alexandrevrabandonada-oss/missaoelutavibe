/**
 * Skip Link Component - Acessibilidade v0
 * Link que permite pular para o conteúdo principal
 * Visível apenas quando focado via teclado
 */

import { skipLinkClass } from "@/utils/a11y";

interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

export function SkipLink({ 
  targetId = "main-content", 
  label = "Pular para o conteúdo" 
}: SkipLinkProps) {
  return (
    <a 
      href={`#${targetId}`} 
      className={skipLinkClass}
    >
      {label}
    </a>
  );
}
