export const fonts = {
  regular: "Figtree-Regular",
  medium: "Figtree-Medium",
  semiBold: "Figtree-SemiBold",
  bold: "Figtree-Bold",
  extraBold: "Figtree-ExtraBold",
} as const;

export type FontFamily = (typeof fonts)[keyof typeof fonts];
