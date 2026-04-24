export const theme = {
  colors: {
    bg: "#F9F7F3",
    surface: "#FFFFFF",
    surfaceMuted: "#F0EAE1",
    surfaceHighlight: "#FFF0E5",
    primary: "#E06D53",
    primaryActive: "#C55B43",
    secondary: "#2A4B41",
    secondaryMuted: "#8DA19A",
    text: "#1A1C19",
    textMuted: "#737771",
    success: "#4A7C59",
    warning: "#F2A65A",
    border: "#E6E1D6",
    overlay: "rgba(26, 28, 25, 0.4)",
    white: "#FFFFFF",
  },
  radius: { sm: 12, md: 16, lg: 24, pill: 9999 },
  space: { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 },
  font: {
    h1: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -1 },
    h2: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.5 },
    h3: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3 },
    bodyLarge: { fontSize: 17, fontWeight: "500" as const },
    body: { fontSize: 15, fontWeight: "400" as const },
    label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2, textTransform: "uppercase" as const },
  },
};

export const IMAGES = {
  heroOnboarding: "https://images.pexels.com/photos/3753039/pexels-photo-3753039.jpeg",
  tropical: "https://images.pexels.com/photos/5876967/pexels-photo-5876967.jpeg",
  amalfi: "https://images.pexels.com/photos/36804947/pexels-photo-36804947.jpeg",
  mountains: "https://images.pexels.com/photos/14974644/pexels-photo-14974644.jpeg",
  flightsEmpty:
    "https://images.unsplash.com/photo-1776239979769-ab5672b094f8?crop=entropy&cs=srgb&fm=jpg&w=1200",
};

export const COVER_OPTIONS = [
  { label: "Tropical", url: IMAGES.tropical },
  { label: "Amalfi", url: IMAGES.amalfi },
  { label: "Mountains", url: IMAGES.mountains },
  {
    label: "Desert",
    url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200",
  },
  {
    label: "City",
    url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200",
  },
  {
    label: "Safari",
    url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200",
  },
];
