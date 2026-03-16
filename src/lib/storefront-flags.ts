const isEnabled = (value: string | undefined) => value === "true";
const isEnabledOrDefault = (value: string | undefined, defaultValue = false) =>
  value === undefined ? defaultValue : value === "true";

export const isHomepageRefreshV2Enabled =
  isEnabled(import.meta.env.VITE_UI_REFRESH_HOMEPAGE_V2);

export const isPdpRefreshV2Enabled =
  isEnabled(import.meta.env.VITE_UI_REFRESH_PDP_V2);

export const isHomepageVisualUpgradeV3Enabled =
  isEnabledOrDefault(import.meta.env.VITE_UI_VISUAL_UPGRADE_V3, true);

export const isPdpVisualUpgradeV3Enabled =
  isEnabled(import.meta.env.VITE_UI_PDP_VISUAL_V3);
