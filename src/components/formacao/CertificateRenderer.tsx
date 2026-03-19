/**
 * Certificate Renderer - Renders certificates in #ÉLUTA visual identity
 * Uses similar approach to Template Engine for image generation
 */
import { forwardRef } from "react";
import { TemplateFormat, TEMPLATE_FORMATS } from "@/components/fabrica/template-engine/types";

export interface CertificateData {
  /** Nome do voluntário */
  volunteerName: string;
  /** Título do curso */
  courseTitle: string;
  /** Nível do curso */
  courseLevel: string;
  /** Data de conclusão */
  completedAt: string;
  /** Código do certificado */
  certificateCode: string;
  /** Cidade do voluntário (opcional) */
  cidade?: string;
}

interface CertificateRendererProps {
  data: CertificateData;
  format: TemplateFormat;
  scale?: number;
  className?: string;
}

export const CertificateRenderer = forwardRef<HTMLDivElement, CertificateRendererProps>(
  ({ data, format, scale = 1, className = "" }, ref) => {
    const config = TEMPLATE_FORMATS[format];
    const { volunteerName, courseTitle, courseLevel, completedAt, certificateCode, cidade } = data;

    // Dimensões escaladas
    const width = config.width * scale;
    const height = config.height * scale;

    // Ajusta tamanhos de fonte baseado no formato e escala
    const titleSize = (format === "4:5" ? 48 : 44) * scale;
    const nameSize = (format === "4:5" ? 56 : 52) * scale;
    const subtitleSize = (format === "4:5" ? 24 : 22) * scale;
    const smallSize = 16 * scale;
    const seloSize = 24 * scale;

    // Padding adaptativo
    const padding = (format === "4:5" ? 60 : 48) * scale;

    // Formatar data
    const formattedDate = new Date(completedAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#0B0B0E",
          fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
          color: "#F2F2F2",
        }}
      >
        {/* Textura urbana sutil */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 20% 80%, rgba(192, 57, 43, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 209, 0, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: "none",
          }}
        />

        {/* Noise texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
            pointerEvents: "none",
          }}
        />

        {/* Bordas stencil discretas */}
        <div
          style={{
            position: "absolute",
            inset: padding * 0.5,
            border: `${2 * scale}px solid rgba(255, 209, 0, 0.15)`,
            pointerEvents: "none",
          }}
        />

        {/* Corner accents */}
        <div
          style={{
            position: "absolute",
            top: padding * 0.5,
            left: padding * 0.5,
            width: 40 * scale,
            height: 40 * scale,
            borderTop: `${3 * scale}px solid #FFD100`,
            borderLeft: `${3 * scale}px solid #FFD100`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: padding * 0.5,
            right: padding * 0.5,
            width: 40 * scale,
            height: 40 * scale,
            borderTop: `${3 * scale}px solid #FFD100`,
            borderRight: `${3 * scale}px solid #FFD100`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.5,
            left: padding * 0.5,
            width: 40 * scale,
            height: 40 * scale,
            borderBottom: `${3 * scale}px solid #FFD100`,
            borderLeft: `${3 * scale}px solid #FFD100`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.5,
            right: padding * 0.5,
            width: 40 * scale,
            height: 40 * scale,
            borderBottom: `${3 * scale}px solid #FFD100`,
            borderRight: `${3 * scale}px solid #FFD100`,
          }}
        />

        {/* Conteúdo principal */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding,
            textAlign: "center",
            zIndex: 1,
          }}
        >
          {/* Header - Selo #ÉLUTA */}
          <div
            style={{
              position: "absolute",
              top: padding,
              left: padding,
              display: "flex",
              alignItems: "center",
              gap: 8 * scale,
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 209, 0, 0.15)",
                border: `${1 * scale}px solid rgba(255, 209, 0, 0.4)`,
                borderRadius: 4 * scale,
                padding: `${4 * scale}px ${10 * scale}px`,
                fontSize: seloSize,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#FFD100",
              }}
            >
              #ÉLUTA
            </div>
          </div>

          {/* Título do Certificado */}
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#FFD100",
              marginBottom: 16 * scale,
            }}
          >
            CERTIFICADO
          </div>

          {/* Subtítulo */}
          <div
            style={{
              fontSize: subtitleSize,
              color: "rgba(242, 242, 242, 0.8)",
              marginBottom: 32 * scale,
            }}
          >
            Formação Completada
          </div>

          {/* Nome do voluntário */}
          <div
            style={{
              fontSize: nameSize,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#F2F2F2",
              marginBottom: 24 * scale,
              lineHeight: 1.2,
              maxWidth: "90%",
            }}
          >
            {volunteerName}
          </div>

          {/* Curso */}
          <div
            style={{
              fontSize: subtitleSize,
              color: "rgba(242, 242, 242, 0.7)",
              marginBottom: 8 * scale,
            }}
          >
            concluiu com sucesso o curso
          </div>

          <div
            style={{
              fontSize: titleSize * 0.85,
              fontWeight: 600,
              color: "#FFD100",
              marginBottom: 8 * scale,
              lineHeight: 1.3,
              maxWidth: "85%",
            }}
          >
            {courseTitle}
          </div>

          {/* Nível */}
          <div
            style={{
              backgroundColor: "rgba(255, 209, 0, 0.1)",
              border: `${1 * scale}px solid rgba(255, 209, 0, 0.3)`,
              borderRadius: 4 * scale,
              padding: `${4 * scale}px ${12 * scale}px`,
              fontSize: smallSize,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#FFD100",
              marginBottom: 32 * scale,
            }}
          >
            NÍVEL {courseLevel.toUpperCase()}
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: padding,
              left: padding,
              right: padding,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: smallSize * 0.9,
                  color: "rgba(242, 242, 242, 0.5)",
                }}
              >
                {formattedDate}
              </div>
              {cidade && (
                <div
                  style={{
                    fontSize: smallSize * 0.9,
                    color: "rgba(242, 242, 242, 0.5)",
                  }}
                >
                  {cidade}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: smallSize * 0.8,
                  color: "rgba(242, 242, 242, 0.4)",
                  letterSpacing: "0.05em",
                }}
              >
                Código: {certificateCode.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Assinatura */}
          <div
            style={{
              position: "absolute",
              bottom: padding + 40 * scale,
              fontSize: smallSize,
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: "rgba(255, 209, 0, 0.6)",
            }}
          >
            ESCUTAR • CUIDAR • ORGANIZAR
          </div>
        </div>
      </div>
    );
  }
);

CertificateRenderer.displayName = "CertificateRenderer";
