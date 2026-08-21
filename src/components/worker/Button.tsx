"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties } from "react";

/**
 * Общая CTA-кнопка рабочих экранов — раньше `style` копировался инлайн в
 * 7 местах (page.tsx, error.tsx, ConflictScreen×2, CheckRequirementScreen,
 * MatchScreen, MismatchScreen) с одними и теми же значениями. Размер/паддинг
 * (--text-7, 1.5rem 2rem, radius-lg) не меняются — раздел ТЗ "результат
 * читается за секунду", крупные touch targets — сознательно оставлены как
 * в исходных экранах, а не пересчитаны под DealDeck. Меняется только цвет:
 * все primary CTA теперь --brand-primary (было --brand-orange) с мягким
 * --shadow-primary вместо плоской заливки.
 */
type Variant = "primary" | "secondary";

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "var(--text-7)",
  fontWeight: 700,
  padding: "1.5rem 2rem",
  width: "100%",
  maxWidth: 480,
  textAlign: "center",
  textDecoration: "none",
  borderRadius: "var(--radius-lg)",
  cursor: "pointer",
};

const variantStyle: Record<Variant, CSSProperties> = {
  primary: {
    border: "none",
    backgroundColor: "var(--brand-primary)",
    color: "var(--on-brand)",
    boxShadow: "var(--shadow-primary)",
  },
  secondary: {
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-card)",
    color: "var(--text-primary)",
  },
};

type CommonProps = { variant?: Variant; style?: CSSProperties };

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button({ variant = "primary", style, ...props }: ButtonAsButton | ButtonAsLink) {
  const mergedStyle = { ...baseStyle, ...variantStyle[variant], ...style };

  if (props.href) {
    const { href, ...linkProps } = props;
    return <Link href={href} style={mergedStyle} {...linkProps} />;
  }

  const { ...buttonProps } = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button type="button" style={mergedStyle} {...buttonProps} />;
}
