import { HomeAnnouncementBar } from "./HomeAnnouncementBar";
import { HomeHeaderOverlay } from "./HomeHeaderOverlay";

type SiteHeaderVariant = "hero" | "page";

export const SiteHeader = ({ variant }: { variant: SiteHeaderVariant }) => {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] rounded bg-background px-4 py-3 text-foreground shadow-lg">Salta al contenuto</a>
      <HomeAnnouncementBar variant={variant} />
      <HomeHeaderOverlay variant={variant} />
    </>
  );
};

