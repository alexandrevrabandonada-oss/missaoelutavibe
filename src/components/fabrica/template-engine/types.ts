/**
 * Template Engine v0 - Types
 * Geração de artes PNG na identidade #ÉLUTA
 */

export interface TemplateData {
  /** Headline principal (máx ~50 chars) */
  title: string;
  /** Subtítulo/contexto (máx ~80 chars) */
  subtitle?: string;
  /** Call-to-action (máx ~40 chars) */
  cta?: string;
  /** Rodapé customizado (default: hashtag) */
  footer?: string;
  /** Handle/arroba (ex: @alexandre_fonseca) */
  handle?: string;
  /** Nome do candidato (oficial: Alexandre Fonseca) */
  name?: string;
  /** Cidade (ex: São Paulo) */
  cidade?: string;
  /** URL de imagem de fundo (opcional) */
  backgroundImage?: string;
  /** Palavras a destacar em amarelo (separadas por |) */
  emphasisWords?: string;
}

export type TemplateFormat = '1:1' | '4:5' | '9:16';

export interface TemplateFormatConfig {
  width: number;
  height: number;
  label: string;
  variantKey: 'square_1x1' | 'feed_4x5' | 'vertical_9x16';
}

export const TEMPLATE_FORMATS: Record<TemplateFormat, TemplateFormatConfig> = {
  '1:1': {
    width: 1080,
    height: 1080,
    label: 'Quadrado (1:1)',
    variantKey: 'square_1x1',
  },
  '4:5': {
    width: 1080,
    height: 1350,
    label: 'Feed (4:5)',
    variantKey: 'feed_4x5',
  },
  '9:16': {
    width: 1080,
    height: 1920,
    label: 'Stories/Reels (9:16)',
    variantKey: 'vertical_9x16',
  },
};

export interface GeneratedImage {
  format: TemplateFormat;
  dataUrl: string;
  filename: string;
  blob?: Blob;
}
