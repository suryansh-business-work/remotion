import React from "react";
import { Img, staticFile } from "remotion";
import { theme, WORDMARK_ASPECT, WORDMARK_RATIO } from "./theme";

/** The white "duncit" lettering, lifted off its red plate (transparent PNG). */
export const Wordmark: React.FC<{ width: number; opacity?: number }> = ({
  width,
  opacity = 1,
}) => (
  <Img
    src={staticFile("duncit-wordmark.png")}
    style={{
      width,
      height: width / WORDMARK_ASPECT,
      maxWidth: "none",
      maxHeight: "none",
      opacity,
      display: "block",
    }}
  />
);

/**
 * The brand plate: a red rounded rect with the wordmark centred inside it.
 * Used at every size from full-bleed intro panel down to the corner watermark,
 * so the mark keeps identical proportions throughout the docking animation.
 */
export const BrandPlate: React.FC<{
  width: number;
  height: number;
  radius: number;
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({ width, height, radius, shadow = true, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius,
      background: `linear-gradient(145deg, ${theme.brandLight} 0%, ${theme.brand} 45%, ${theme.brandDeep} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: shadow ? `0 ${height * 0.14}px ${height * 0.5}px ${theme.brandGlow}` : "none",
      ...style,
    }}
  >
    <Wordmark width={width * WORDMARK_RATIO} />
  </div>
);
