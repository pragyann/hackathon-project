import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Button -- */

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm",
        secondary:
          "bg-bg-raised text-fg border border-border-strong hover:border-fg-subtle hover:bg-bg-subtle",
        ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

/* ------------------------------------------------------------------ Card -- */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-bg-raised shadow-[var(--shadow-sm)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-base font-bold tracking-tight text-fg", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

/* ----------------------------------------------------------------- Badge -- */

const badge = cva(
  "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border bg-bg-subtle text-fg-muted",
        accent: "border-accent-border bg-accent-subtle text-accent",
        route: "border-route-strong/40 bg-route-subtle text-route-fg",
        evidence: "border-evidence-border bg-evidence-subtle text-evidence",
        partial: "border-partial-border bg-partial-subtle text-partial",
        gap: "border-gap-border bg-gap-subtle text-gap",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/* --------------------------------------------------------------- Eyebrow -- */

/** Signage voice: small mono caps above a heading. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("eyebrow text-fg-subtle", className)} {...props} />;
}

/* ------------------------------------------------------------------ Misc -- */

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-sm font-semibold text-fg mb-1.5", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border-strong bg-bg-raised px-3 text-sm text-fg",
        "placeholder:text-fg-subtle transition-colors hover:border-fg-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-border-strong bg-bg-raised px-3 text-sm text-fg",
        "transition-colors hover:border-fg-subtle",
        className,
      )}
      {...props}
    />
  );
}

/** Section heading with an eyebrow and an optional right-hand slot. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
        <h2 className="text-xl font-extrabold tracking-tight text-fg">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-bg-subtle", className)} />
  );
}
