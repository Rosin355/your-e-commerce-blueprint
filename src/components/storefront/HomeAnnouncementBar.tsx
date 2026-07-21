import { Sparkles } from "lucide-react";

type AnnouncementVariant = "hero" | "page";

export const HomeAnnouncementBar = ({ variant = "hero" }: { variant?: AnnouncementVariant }) => {
  const wrapperClassName =
    variant === "hero"
      ? "absolute inset-x-0 top-0 z-40 bg-primary-dark text-primary-foreground shadow-sm"
      : "sticky top-0 z-50 w-full bg-primary-dark text-primary-foreground shadow-sm";


  return (
    <div className={wrapperClassName}>
      <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-center px-4 text-[12px] font-semibold uppercase tracking-[0.1em] md:text-[13px]">
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <Sparkles className="h-4 w-4" />
          Rose, bulbi e piante da esterno selezionate per la stagione
        </span>
      </div>
    </div>
  );
};
