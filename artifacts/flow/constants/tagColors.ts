export const TAG_COLOR_OPTIONS: [string, string][] = [
  ["gray", "#94a3b8"],
  ["sky", "#4f9de0"],
  ["navy", "#10366b"],
  ["green", "#0f766e"],
  ["coral", "#b91c1c"],
  ["amber", "#d97706"],
  ["violet", "#7c3aed"],
  ["pink", "#db2777"],
];

export function tagTintHex(colorKey: string | null | undefined): string {
  if (!colorKey) return "#94a3b8";
  return TAG_COLOR_OPTIONS.find(([key]) => key === colorKey)?.[1] ?? "#94a3b8";
}
