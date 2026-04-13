export enum ColorOwnership {
  AVAILABLE = "AVAILABLE",
  TAKEN_BY_OTHER = "TAKEN_BY_OTHER",
  OWNED_BY_USER = "OWNED_BY_USER",
  CUSTOM = "CUSTOM",
}

export interface PlayerColorInfo {
  userId: string;
  color: string;
  username?: string;
}

/**
 * Classifies a color into one of four states relative to the current user.
 *
 * Rules:
 * - CUSTOM:         color is not in the default palette (unlimited, always selectable)
 * - AVAILABLE:      in the palette, not claimed by anyone
 * - OWNED_BY_USER:  in the palette, claimed by the current user
 * - TAKEN_BY_OTHER: in the palette, claimed by a different player
 *
 * Premium unlocks CUSTOM selection only. It does not override ownership of
 * default palette colors.
 */
export function getColorOwnership(
  color: string,
  currentUserId: string | null,
  playerColors: PlayerColorInfo[],
  defaultColors: string[],
): ColorOwnership {
  if (!defaultColors.includes(color)) return ColorOwnership.CUSTOM;

  const owner = playerColors.find((p) => p.color === color);
  if (!owner) return ColorOwnership.AVAILABLE;
  if (currentUserId && owner.userId === currentUserId) return ColorOwnership.OWNED_BY_USER;
  return ColorOwnership.TAKEN_BY_OTHER;
}

/**
 * Returns true if the color may be selected by the current user.
 */
export function isColorSelectable(ownership: ColorOwnership): boolean {
  return (
    ownership === ColorOwnership.AVAILABLE ||
    ownership === ColorOwnership.OWNED_BY_USER ||
    ownership === ColorOwnership.CUSTOM
  );
}
