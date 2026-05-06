// Credits modal — matches the GameRulesModal styling (centered card,
// dark backdrop, mono section captions, display font for the title).
// Contents are split into named sections with a small accent rule.

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "../../i18n";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SectionProps {
  caption: string;
  children: React.ReactNode;
}

function Section({ caption, children }: SectionProps) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(245,234,208,0.55)",
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: "1px solid rgba(245,234,208,0.08)",
        }}
      >
        {caption}
      </div>
      <div style={{ color: "rgba(245,234,208,0.85)", fontSize: 13.5, lineHeight: 1.55 }}>
        {children}
      </div>
    </section>
  );
}

function SubGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(245,234,208,0.45)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "4px 24px",
        }}
      >
        {children}
      </ul>
    </div>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--accent, #f0c14a)",
        textDecoration: "none",
        borderBottom: "1px dotted rgba(240,193,74,0.4)",
      }}
    >
      {children}
    </a>
  );
}

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
          className="relative w-full max-w-xl game-rules-modal flex flex-col"
          style={{ maxHeight: "85vh" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              padding: "20px 24px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#f5ead0",
                  letterSpacing: "-0.01em",
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                {t.credits.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label={t.rules.close}
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(245,234,208,0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: "20px 24px",
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
            }}
          >
            <Section caption={t.credits.dedicatedTo}>
              <p style={{ margin: 0 }}>{t.credits.dedicatedToBody}</p>
            </Section>

            <Section caption={t.credits.originalGame}>
              <p style={{ margin: 0 }}>{t.credits.originalGameBody}</p>
            </Section>

            <Section caption={t.credits.music}>
              <p style={{ margin: 0 }}>
                <ExternalLink href="https://pixabay.com/users/casino-vip-music-54275592/">
                  {t.credits.musicBody}
                </ExternalLink>
              </p>
            </Section>

            <Section caption={t.credits.openSource}>
              <SubGroup label={t.credits.frontend}>
                <li>
                  <ExternalLink href="https://react.dev">React</ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://reactrouter.com">
                    React Router
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://zustand.docs.pmnd.rs">
                    Zustand
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://www.framer.com/motion/">
                    Framer Motion
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://lucide.dev">Lucide</ExternalLink>{" "}
                  ({t.credits.iconsBy})
                </li>
                <li>
                  <ExternalLink href="https://github.com/timruffles/mobile-drag-drop">
                    mobile-drag-drop
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://github.com/web-kits/audio">
                    @web-kits/audio
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://github.com/web-kits/web-haptics">
                    web-haptics
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://tailwindcss.com">
                    Tailwind CSS
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://vite.dev">Vite</ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://www.typescriptlang.org">
                    TypeScript
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://umami.is">Umami</ExternalLink>{" "}
                  ({t.credits.analytics})
                </li>
              </SubGroup>

              <SubGroup label={t.credits.backend}>
                <li>
                  <ExternalLink href="https://bun.sh">Bun</ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://hono.dev">Hono</ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://www.typescriptlang.org">
                    TypeScript
                  </ExternalLink>
                </li>
              </SubGroup>
            </Section>

            <Section caption={t.credits.madeBy}>
              <p style={{ margin: 0 }}>
                <ExternalLink href="https://alex.wohlbruck.com">
                  Alex Wohlbruck
                </ExternalLink>
              </p>
            </Section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
