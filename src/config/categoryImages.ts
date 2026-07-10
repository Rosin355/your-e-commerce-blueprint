/**
 * Mappa condivisa chiave immagine → URL asset, usata dai componenti di navigazione
 * (Header, HomeHeaderOverlay). Centralizzata qui per evitare duplicazione e drift:
 * il tipo Record<CategoryImageKey, string> garantisce a compile-time che ogni chiave
 * definita in `categories.ts` abbia un asset corrispondente.
 */
import type { CategoryImageKey } from "./categories";

// Immagini "megamenu" storiche
import outdoorLivingImg from "@/assets/megamenu/outdoor-living.jpg";
import evergreenGardenImg from "@/assets/megamenu/evergreen-garden.jpg";
import roseSelectionImg from "@/assets/megamenu/rose-selection.jpg";
import roseGiftImg from "@/assets/megamenu/rose-gift.jpg";
import citrusImg from "@/assets/megamenu/citrus.jpg";
import berriesImg from "@/assets/megamenu/berries.jpg";
import potsAccessoriesImg from "@/assets/megamenu/pots-accessories.jpg";
import bulbsSeasonalImg from "@/assets/megamenu/bulbs-seasonal.jpg";

// Foto categoria dedicate (ottimizzate da src/assets/foto home/*)
import alberiImg from "@/assets/categories/alberi.jpg";
import arbustiImg from "@/assets/categories/arbusti.jpg";
import aromaticheImg from "@/assets/categories/aromatiche.jpg";
import conifereImg from "@/assets/categories/conifere.jpg";
import erbaceeGraminaceeImg from "@/assets/categories/erbacee-graminacee.jpg";
import alberiDaFruttoImg from "@/assets/categories/alberi-da-frutto.jpg";
import pianteGrasseImg from "@/assets/categories/piante-grasse.jpg";
import piantePalustriImg from "@/assets/categories/piante-palustri.jpg";
import piccoliFruttiImg from "@/assets/categories/piccoli-frutti.jpg";
import rampicantiImg from "@/assets/categories/rampicanti.jpg";
import roseImg from "@/assets/categories/rose.jpg";
import roseRampicantiImg from "@/assets/categories/rose-rampicanti.jpg";
import siepiImg from "@/assets/categories/siepi.jpg";

export const CATEGORY_IMAGES: Record<CategoryImageKey, string> = {
  outdoorLiving: outdoorLivingImg,
  evergreenGarden: evergreenGardenImg,
  roseSelection: roseSelectionImg,
  roseGift: roseGiftImg,
  citrus: citrusImg,
  berries: berriesImg,
  potsAccessories: potsAccessoriesImg,
  bulbsSeasonal: bulbsSeasonalImg,
  alberi: alberiImg,
  arbusti: arbustiImg,
  aromatiche: aromaticheImg,
  conifere: conifereImg,
  erbaceeGraminacee: erbaceeGraminaceeImg,
  alberiDaFrutto: alberiDaFruttoImg,
  pianteGrasse: pianteGrasseImg,
  piantePalustri: piantePalustriImg,
  piccoliFrutti: piccoliFruttiImg,
  rampicanti: rampicantiImg,
  rose: roseImg,
  roseRampicanti: roseRampicantiImg,
  siepi: siepiImg,
};
