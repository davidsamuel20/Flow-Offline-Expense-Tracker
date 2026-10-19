/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#0b2244',
    tint: '#10366b',
    background: '#f2f6fa',
    foreground: '#0b2244',
    card: '#ffffff',
    cardForeground: '#0b2244',
    primary: '#10366b',
    primaryForeground: '#ffffff',
    secondary: '#e5f0f9',
    secondaryForeground: '#10366b',
    muted: '#edf3f8',
    mutedForeground: '#526b88',
    accent: '#d8e9f6',
    accentForeground: '#0b2244',
    destructive: '#b91c1c',
    destructiveForeground: '#ffffff',
    border: '#dbe5ef',
    input: '#cbdde9',
    income: '#0f766e',
    expense: '#b91c1c',
    sky: '#4f9de0',
    deepBlue: '#0f3460',
    white: '#ffffff',
    whiteSoft: 'rgba(255,255,255,0.76)',
    whiteGlass: 'rgba(255,255,255,0.18)',
    whiteDivider: 'rgba(255,255,255,0.22)',
    whiteMuted: 'rgba(255,255,255,0.70)',
    overlay: 'rgba(11,34,68,0.35)',
    handle: '#b8c9d9',
    incomeSoft: '#e6f7f3',
    expenseSoft: '#fef2f2',
  },

  radius: 16,
};

export default colors;
