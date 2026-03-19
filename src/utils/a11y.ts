/**
 * Accessibility Utilities - Acessibilidade v0
 * Helpers para navegação por teclado, ARIA e foco visível
 */

/**
 * Classe CSS padrão para foco visível (ring amarelo #ÉLUTA)
 * Uso: className={focusRingClass()}
 */
export function focusRingClass(options?: { offset?: boolean }): string {
  const offset = options?.offset !== false;
  return offset
    ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
}

/**
 * Classe CSS para elementos visualmente ocultos mas acessíveis a screen readers
 * Uso: className={srOnlyClass}
 */
export const srOnlyClass = "sr-only";

/**
 * Classe CSS para "skip links" que aparecem apenas no foco
 * Uso: className={skipLinkClass}
 */
export const skipLinkClass = 
  "sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded focus:font-bold focus:shadow-lg";

/**
 * Valida se um aria-label foi fornecido (use em componentes internos)
 * @throws Error se aria-label não for fornecido em ambiente de desenvolvimento
 */
export function ariaLabelOrThrow(
  ariaLabel: string | undefined,
  componentName: string
): string {
  if (!ariaLabel && process.env.NODE_ENV === "development") {
    console.warn(
      `[a11y] ${componentName}: aria-label obrigatório não fornecido. ` +
      `Adicione aria-label para melhorar a acessibilidade.`
    );
  }
  return ariaLabel || "";
}

/**
 * Gera um ID único para ARIA relationships
 * Uso: const titleId = generateAriaId("dialog-title");
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook-safe keyboard navigation helpers
 */
export const keyboardNav = {
  /**
   * Verifica se a tecla pressionada é Enter ou Space (ativação padrão)
   */
  isActivation: (event: React.KeyboardEvent): boolean => {
    return event.key === "Enter" || event.key === " ";
  },

  /**
   * Verifica se a tecla pressionada é Escape
   */
  isEscape: (event: React.KeyboardEvent): boolean => {
    return event.key === "Escape";
  },

  /**
   * Verifica se é uma tecla de navegação por setas
   */
  isArrowKey: (event: React.KeyboardEvent): boolean => {
    return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key);
  },

  /**
   * Previne comportamento padrão e para propagação
   */
  prevent: (event: React.KeyboardEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  },
};

/**
 * Focus trap utilities para modais
 */
export const focusTrap = {
  /**
   * Obtém todos os elementos focáveis dentro de um container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
  },

  /**
   * Foca o primeiro elemento focável dentro de um container
   */
  focusFirst: (container: HTMLElement): void => {
    const elements = focusTrap.getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus();
    }
  },
};
