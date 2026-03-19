/**
 * ReciboImageCard — F11.2 + F11.2b: Off-screen 1:1 card for image capture
 * 
 * Privacy-first: uses same sanitizeLocal, no PII, no media.
 * Styled inline (not Tailwind) for html-to-image reliability.
 * 
 * F11.2b hardening:
 * - Text truncation with ellipsis for long titles/synthesis/locations
 * - Clamped line counts to prevent overflow
 * - Reduced visual weight for faster capture
 */

import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMissionTypeLabel } from "@/lib/missionLabels";
import { sanitizeLocal, type ShareRegistroData, type ShareCicloData } from "./ShareReciboModal";

type CardData =
  | { kind: "registro"; data: ShareRegistroData }
  | { kind: "ciclo"; data: ShareCicloData };

interface Props {
  share: CardData;
}

/** Truncate text to maxLen chars with ellipsis */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

const CARD_SIZE = 540;

/* ── Shared inline styles ── */

const clampLine = (lines: number, lineHeight: number, fontSize: number) => ({
  overflow: "hidden" as const,
  display: "-webkit-box" as const,
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  lineHeight,
  fontSize,
  maxHeight: Math.ceil(lines * fontSize * lineHeight),
});

const styles = {
  wrapper: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    background: "linear-gradient(160deg, #0B0B0E 0%, #1a1a1f 60%, #0B0B0E 100%)",
    color: "#F2F2F2",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    padding: 40,
    boxSizing: "border-box" as const,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  topBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255, 209, 0, 0.12)",
    border: "1px solid rgba(255, 209, 0, 0.3)",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#FFD100",
    textTransform: "uppercase" as const,
    width: "fit-content",
    flexShrink: 0,
  },
  checkmark: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#FFD100",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    color: "#0B0B0E",
    fontWeight: 900,
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    gap: 12,
    minHeight: 0, // allow shrink
    overflow: "hidden" as const,
  },
  missionTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 700,
    color: "#F2F2F2",
    wordBreak: "break-word" as const,
    ...clampLine(3, 1.2, 26),
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255, 209, 0, 0.6)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    flexShrink: 0,
  },
  metaRow: {
    fontSize: 14,
    color: "rgba(242, 242, 242, 0.65)",
    lineHeight: 1.5,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  metaLabel: {
    color: "rgba(255, 209, 0, 0.7)",
    fontWeight: 600,
    marginRight: 6,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    flexShrink: 0,
  },
  statBox: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: "14px 10px",
    textAlign: "center" as const,
  },
  statNumber: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: "#FFD100",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: "rgba(242, 242, 242, 0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginTop: 4,
  },
  synthesis: {
    color: "rgba(242, 242, 242, 0.55)",
    fontStyle: "italic" as const,
    wordBreak: "break-word" as const,
    ...clampLine(3, 1.5, 13),
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  brand: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#FFD100",
  },
  brandSub: {
    fontSize: 9,
    letterSpacing: "0.2em",
    color: "rgba(242, 242, 242, 0.35)",
    textTransform: "uppercase" as const,
    marginTop: 2,
  },
  cornerAccent: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    background: "linear-gradient(225deg, rgba(255, 209, 0, 0.08) 0%, transparent 70%)",
    pointerEvents: "none" as const,
  },
};

/* ── Registro card ── */

function RegistroCard({ data }: { data: ShareRegistroData }) {
  const local = sanitizeLocal(data.local_texto, data.cidade);
  const typeLabel = data.mission_type ? getMissionTypeLabel(data.mission_type) : null;
  const dateStr = data.validated_at
    ? format(new Date(data.validated_at), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  // Truncate title at char level as safety net (CSS clamp handles visual)
  const title = truncate(data.mission_title, 100);
  const localTruncated = local ? truncate(local, 60) : null;

  return (
    <>
      <div style={styles.topBadge}>
        <span style={styles.checkmark}>✓</span>
        Recibo emitido
      </div>

      <div style={styles.body}>
        {typeLabel && <div style={styles.typeLabel}>{typeLabel}</div>}
        <div style={styles.missionTitle}>{title}</div>

        {dateStr && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Validado</span>
            {dateStr}
          </div>
        )}
        {localTruncated && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Local</span>
            {localTruncated}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Ciclo card ── */

function CicloCard({ data }: { data: ShareCicloData }) {
  const inicio = format(new Date(data.inicio), "dd MMM", { locale: ptBR });
  const fim = format(new Date(data.fim), "dd MMM yyyy", { locale: ptBR });
  const sinteseTrimmed = data.sintese ? truncate(data.sintese, 140) : null;
  const titulo = truncate(data.titulo, 80);

  return (
    <>
      <div style={styles.topBadge}>
        <span style={{ ...styles.checkmark, background: "#F2F2F2", color: "#0B0B0E" }}>📊</span>
        Ciclo encerrado
      </div>

      <div style={styles.body}>
        <div style={{ ...styles.missionTitle, ...clampLine(2, 1.2, 22) }}>{titulo}</div>
        <div style={{ ...styles.metaRow, fontSize: 13 }}>
          {inicio} — {fim}
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{data.total_registros_celula}</div>
            <div style={styles.statLabel}>Registros</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{data.membros_participantes}</div>
            <div style={styles.statLabel}>Membros</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{data.missoes_cumpridas}</div>
            <div style={styles.statLabel}>Missões</div>
          </div>
        </div>

        {sinteseTrimmed && (
          <div style={styles.synthesis}>"{sinteseTrimmed}"</div>
        )}
      </div>
    </>
  );
}

/* ── Main wrapper ── */

export const ReciboImageCard = forwardRef<HTMLDivElement, Props>(
  ({ share }, ref) => {
    return (
      <div ref={ref} style={styles.wrapper}>
        <div style={styles.cornerAccent} />

        {share.kind === "registro"
          ? <RegistroCard data={share.data} />
          : <CicloCard data={share.data} />
        }

        <div style={styles.footer}>
          <div>
            <div style={styles.brand}>#ÉLUTA</div>
            <div style={styles.brandSub}>Escutar • Cuidar • Organizar</div>
          </div>
        </div>
      </div>
    );
  }
);

ReciboImageCard.displayName = "ReciboImageCard";
