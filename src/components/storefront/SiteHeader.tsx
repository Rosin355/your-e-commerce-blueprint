import { HomeAnnouncementBar } from "./HomeAnnouncementBar";
import { HomeHeaderOverlay } from "./HomeHeaderOverlay";

type SiteHeaderVariant = "hero" | "page";

export const SiteHeader = ({ variant }: { variant: SiteHeaderVariant }) => {
  return (
    <>
      <HomeAnnouncementBar variant={variant} />
      <HomeHeaderOverlay variant={variant} />
    </>
  );
};

