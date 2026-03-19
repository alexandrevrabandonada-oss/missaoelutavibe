/**
 * TemplateRenderer - Renderiza arte visual na identidade #ÉLUTA
 * 
 * Layout:
 * - Headline central enorme em caixa alta
 * - Palavras de ênfase em amarelo
 * - Fundo com textura urbana sutil
 * - Selo #ÉLUTA e rodapé "ESCUTAR • CUIDAR • ORGANIZAR"
 */

import React, { forwardRef } from "react";
import { TemplateData, TemplateFormat, TEMPLATE_FORMATS } from "./types";

interface TemplateRendererProps {
  data: TemplateData;
  format: TemplateFormat;
  scale?: number; // Para preview (0.3 = 30%)
  className?: string;
}

// Função para destacar palavras em amarelo
function highlightText(text: string, emphasisWords?: string): React.ReactNode {
  if (!emphasisWords || !text) return text;
  
  const words = emphasisWords.split('|').map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return text;

  // Cria regex para todas as palavras
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isEmphasis = words.some(w => w.toLowerCase() === part.toLowerCase());
    if (isEmphasis) {
      return <span key={i} style={{ color: '#FFD100' }}>{part}</span>;
    }
    return part;
  });
}

export const TemplateRenderer = forwardRef<HTMLDivElement, TemplateRendererProps>(
  ({ data, format, scale = 1, className = "" }, ref) => {
    const config = TEMPLATE_FORMATS[format];
    const { title, subtitle, cta, footer, handle, name, cidade, backgroundImage, emphasisWords } = data;

    // Dimensões escaladas
    const width = config.width * scale;
    const height = config.height * scale;

    // Ajusta tamanhos de fonte baseado no formato e escala
    const baseFontSize = format === '9:16' ? 72 : format === '4:5' ? 68 : 64;
    const titleSize = baseFontSize * scale;
    const subtitleSize = (format === '9:16' ? 32 : 28) * scale;
    const ctaSize = (format === '9:16' ? 28 : 24) * scale;
    const footerSize = 18 * scale;
    const handleSize = 20 * scale;
    const seloSize = 24 * scale;

    // Padding adaptativo
    const padding = (format === '9:16' ? 60 : 48) * scale;

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0B0B0E',
          fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
          color: '#F2F2F2',
        }}
      >
        {/* Background image (opcional) */}
        {backgroundImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3,
            }}
          />
        )}

        {/* Textura urbana sutil */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 20% 80%, rgba(192, 57, 43, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 209, 0, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
          }}
        />

        {/* Noise texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
          }}
        />

        {/* Bordas stencil discretas */}
        <div
          style={{
            position: 'absolute',
            inset: padding * 0.5,
            border: `${2 * scale}px solid rgba(255, 209, 0, 0.15)`,
            pointerEvents: 'none',
          }}
        />

        {/* Conteúdo principal */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          {/* Header - Selo #ÉLUTA */}
          <div
            style={{
              position: 'absolute',
              top: padding,
              left: padding,
              display: 'flex',
              alignItems: 'center',
              gap: 8 * scale,
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(255, 209, 0, 0.15)',
                border: `${1 * scale}px solid rgba(255, 209, 0, 0.4)`,
                borderRadius: 4 * scale,
                padding: `${4 * scale}px ${10 * scale}px`,
                fontSize: seloSize,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#FFD100',
              }}
            >
              #ÉLUTA
            </div>
          </div>

          {/* Nome/Handle (canto superior direito) */}
          {(name || handle) && (
            <div
              style={{
                position: 'absolute',
                top: padding,
                right: padding,
                textAlign: 'right',
              }}
            >
              {name && (
                <div
                  style={{
                    fontSize: handleSize,
                    fontWeight: 600,
                    color: '#F2F2F2',
                    letterSpacing: '0.05em',
                  }}
                >
                  {name}
                </div>
              )}
              {handle && (
                <div
                  style={{
                    fontSize: handleSize * 0.85,
                    color: 'rgba(242, 242, 242, 0.6)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {handle}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo central */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 24 * scale,
              maxWidth: '90%',
            }}
          >
            {/* Subtítulo (acima do título) */}
            {subtitle && (
              <div
                style={{
                  fontSize: subtitleSize,
                  fontWeight: 500,
                  color: 'rgba(242, 242, 242, 0.8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </div>
            )}

            {/* Headline principal */}
            <h1
              style={{
                fontSize: titleSize,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: 0,
                color: '#F2F2F2',
                textShadow: `0 ${4 * scale}px ${16 * scale}px rgba(0, 0, 0, 0.5)`,
              }}
            >
              {highlightText(title, emphasisWords)}
            </h1>

            {/* CTA */}
            {cta && (
              <div
                style={{
                  fontSize: ctaSize,
                  fontWeight: 600,
                  color: '#FFD100',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginTop: 16 * scale,
                  padding: `${12 * scale}px ${24 * scale}px`,
                  border: `${2 * scale}px solid #FFD100`,
                  borderRadius: 4 * scale,
                }}
              >
                {cta}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: padding,
              left: padding,
              right: padding,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            {/* Cidade (se houver) */}
            <div>
              {cidade && (
                <div
                  style={{
                    fontSize: footerSize,
                    color: 'rgba(242, 242, 242, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  📍 {cidade}
                </div>
              )}
            </div>

            {/* Assinatura */}
            <div
              style={{
                fontSize: footerSize,
                fontWeight: 500,
                color: 'rgba(242, 242, 242, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
              }}
            >
              {footer || 'ESCUTAR • CUIDAR • ORGANIZAR'}
            </div>
          </div>
        </div>

        {/* Gradiente inferior */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: height * 0.15,
            background: 'linear-gradient(to top, rgba(11, 11, 14, 0.8), transparent)',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }
);

TemplateRenderer.displayName = 'TemplateRenderer';
