import { cn } from "@/lib/utils";

/**
 * The route-shield mark: the gold alphanumeric marker Australian roads use to
 * name a route. Ours names the product. Used as the logo glyph and, small, as
 * the "you are here" marker.
 */
export function RouteShield({
  label = "ON",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] border-2 border-route-fg/70 bg-route font-mono text-[11px] font-bold leading-none text-route-fg",
        "h-6 min-w-7 px-1 tracking-wide",
        className,
      )}
    >
      {label}
    </span>
  );
}
