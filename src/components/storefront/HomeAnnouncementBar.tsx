import { Sparkles } from "lucide-react";

type AnnouncementVariant = "hero" | "page";

export const HomeAnnouncementBar = ({ variant = "hero" }: { variant?: AnnouncementVariant }) => {
  const wrapperClassName =
    variant === "hero"
      ? "absolute inset-x-0 top-0 z-40 bg-primary-dark text-primary-foreground shadow-sm"
      : "sticky top-0 z-50 w-full bg-primary-dark text-primary-foreground shadow-sm";


  return (
    <div className={`${wrapperClassName} overflow-x-clip`}>
      <div className="mx-auto flex h-8 max-w-[1600px] items-center justify-center px-3 text-center text-[10px] font-semibold uppercase tracking-[0.07em] sm:h-9 sm:px-4 sm:text-[12px] sm:tracking-[0.1em] md:text-[13px]">
        <span className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <span className="sm:hidden">Piante selezionate per la stagione</span>
          <span className="hidden sm:inline">Rose, bulbi e piante da esterno selezionate per la stagione</span>
        </span>
      </div>
    </div>
  );
};
