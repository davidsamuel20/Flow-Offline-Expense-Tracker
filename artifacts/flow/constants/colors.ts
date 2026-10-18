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
    text: '#10264a',
    tint: '#4f9fe5',
    background: '#eaf4fc',
    foreground: '#0b2550',
    card: '#d9edfc',
    cardForeground: '#0b2550',
    primary: '#10366b',
    primaryForeground: '#ffffff',
    secondary: '#bfdef6',
    secondaryForeground: '#163c69',
    muted: '#d9edfc',
    mutedForeground: '#667f9b',
    accent: '#a8d5f5',
    accentForeground: '#0b2550',
    destructive: '#d65456',
    destructiveForeground: '#ffffff',
    border: '#bdd7ea',
    input: '#b4d2e9',
    income: '#147a61',
    expense: '#d65456',
    sky: '#6bb4ec',
    deepBlue: '#1e4e88',
    white: '#ffffff',
    whiteSoft: 'rgba(255,255,255,0.72)',
    whiteGlass: 'rgba(255,255,255,0.16)',
    whiteDivider: 'rgba(255,255,255,0.25)',
    whiteMuted: 'rgba(255,255,255,0.68)',
    overlay: 'rgba(5,24,54,0.18)',
    handle: '#afc7db',
    incomeSoft: '#d8f1e8',
    expenseSoft: '#fce5e5',
  },

  radius: 18,
};

export default colors;
