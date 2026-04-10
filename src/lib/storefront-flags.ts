const isEnabledOrDefault = (value: string | undefined, defaultValue = false) =>
  value === undefined ? defaultValue : value === "true";

// V3 is the current production UI — both homepage and PDP default to true.
// Set to "false" in .env to revert to the legacy layout during development.
export const isHomepageVisualUpgradeV3Enabled =
  isEnabledOrDefault(import.meta.env.VITE_UI_VISUAL_UPGRADE_V3, true);

export const isPdpVisualUpgradeV3Enabled =
  isEnabledOrDefault(import.meta.env.VITE_UI_PDP_VISUAL_V3, true);
