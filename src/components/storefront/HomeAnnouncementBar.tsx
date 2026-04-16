import { Sparkles } from "lucide-react";

type AnnouncementVariant = "hero" | "page";

export const HomeAnnouncementBar = ({ variant = "hero" }: { variant?: AnnouncementVariant }) => {
  const wrapperClassName =
    variant === "hero"
      ? "absolute inset-x-0 top-0 z-30 border-b border-white/18 bg-black/12 text-white"
      : "sticky top-0 z-50 w-full border-b border-border/60 bg-black/12 text-white";

  return (
    <div className={wrapperClassName}>
      <div className="mx-auto flex h-7 max-w-[1600px] items-center justify-center px-4 text-[9px] font-medium uppercase tracking-[0.22em] md:h-8 md:text-[10px]">
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <Sparkles className="h-3 w-3" />
          Rose, bulbi e piante da esterno selezionate per la stagione
        </span>
      </div>
    </div>
  );
};
