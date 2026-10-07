import { cn } from "../../_lib/utils";

export function LifestoneLogo({
  className,
  wordmarkClassName,
  size = "md",
}: {
  className?: string;
  wordmarkClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const iconSize =
    size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-[34px]";
  const textSize =
    size === "sm"
      ? "text-lg tracking-[-0.6px] leading-6"
      : size === "lg"
        ? "text-[28px] tracking-[-1px] leading-[36px]"
        : "text-2xl tracking-[-0.8px] leading-[32px]";

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "flex items-center justify-center text-foreground",
          iconSize
        )}
        <img src="/brand/lifestone-logo.png" alt="Lifestone" className="h-full w-auto object-contain drop-shadow-[0_0_12px_rgba(25,215,255,0.4)]" />
      </span>
      <span className={cn("font-medium text-foreground", textSize, wordmarkClassName)}>
        Lifestone
      </span>
    </span>
  );
}
