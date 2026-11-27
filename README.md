<img src="./assets/logo.svg" width="56" height="56" alt="">

# React Extract Colors

[![npm version](https://img.shields.io/npm/v/react-extract-colors.svg)](https://www.npmjs.com/package/react-extract-colors)
[![Tests on main](https://github.com/jesus-aguiIar/react-extract-colors/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/jesus-aguiIar/react-extract-colors/actions/workflows/test.yml?query=branch%3Amain)

Extract a color palette from an image with a React hook. Choose dominant colors for backgrounds or vibrant colors for accents.

**[Try the live demo on Netlify](https://react-extract-colors.netlify.app/)** · [API reference](#api) · [GitHub](https://github.com/jesus-aguiIar/react-extract-colors)

## Installation

```sh
npm install react-extract-colors
```

With pnpm, use `pnpm add react-extract-colors`. With Yarn, use `yarn add react-extract-colors`.

## Usage

Call `useExtractColors` inside a React component. Pass the URL of an image your browser can display, such as a photo served from your app.

```jsx
import { useExtractColors } from "react-extract-colors";

export function PhotoPalette({ imageUrl }) {
  const { colors, loading, error } = useExtractColors(imageUrl, {
    format: "hex",
    maxColors: 5,
    sortBy: "dominance",
  });

  if (loading) return <p>Reading the image…</p>;
  if (error) return <p>Could not read the image.</p>;
  if (colors.length === 0) return <p>No visible colors found.</p>;

  return (
    <ul>
      {colors.map((color, index) => (
        <li key={index} style={{ borderLeft: `1em solid ${color}`, paddingLeft: 8 }}>
          {color}
        </li>
      ))}
    </ul>
  );
}
```

For an image hosted on another domain, its server must allow your origin through CORS so the browser can read the pixels.

## API

`useExtractColors(imageUrl, options?)` returns the palette and its loading state. Extraction runs in the browser after the component mounts.

| Result | Meaning |
| --- | --- |
| `colors` | Palette in the requested format and ranking, capped at `maxColors`. |
| `dominantColor` | The top-ranked shade. With `vibrance`, this is the most vibrant shade. |
| `darkerColor`, `lighterColor` | Darker and lighter variants of the top-ranked shade, useful as gradient stops. |
| `textColor` | Opaque hex text color for use on `dominantColor` in either ranking mode. Returns `null` until a visible shade is available. |
| `loading` | `true` while the hook reads the image. |
| `error` | An `Error` if the image could not be loaded or read, otherwise `null`. |

### Options

Passing `undefined` for an option uses its default value.

| Option | Default | Effect |
| --- | --- | --- |
| `sortBy` | `"dominance"` | Rank color groups by pixel count. Use `"vibrance"` to rank by saturation × brightness. Ranking happens before the palette is limited to `maxColors`. |
| `maxColors` | `3` | Maximum number of palette entries. Zero or a negative value returns an empty `colors` array. The hook still computes the top shade, its variants and its text color. |
| `format` | `"rgba"` | Output format for the palette and its shades. Also accepts `"hex"`, `"rgb"`, `"hsl"`, and `"hsv"`. |
| `maxSize` | `18` | Maximum length of the sampled image’s longest side, in pixels. Increase it to pick up finer details. |
| `colorSimilarityThreshold` | `50` | RGB distance used to group similar shades. Lower it to keep close tones separate. Use `0` to count exact RGBA shades. |
| `textContrast` | `4.5` | Target contrast ratio for `textColor` against `dominantColor`. Accepts finite numbers from 1 to 21. |
| `crossOrigin` | `"anonymous"` | Image request’s CORS mode. Use `"use-credentials"` for a server configured to accept credentialed requests. |

### How similar colors are grouped

The hook skips sampled pixels with an alpha below 125 out of 255. Each remaining shade joins the first group whose starting color is within the chosen RGB distance. The most frequent exact shade represents each group. Ties go to the shade sampled first.

### Text on the first palette color

`textColor` and `textContrast` were added after npm version 1.6.0. For a card or badge, apply `dominantColor` as its background and `textColor` as its foreground. This works with either `sortBy` setting.

```jsx
import { useExtractColors } from "react-extract-colors";

export function PhotoBadge({ imageUrl, children }) {
  const { dominantColor, textColor } = useExtractColors(imageUrl, {
    format: "hex",
    textContrast: 7,
  });

  if (!dominantColor || !textColor) return null;
  return <span style={{ backgroundColor: dominantColor, color: textColor }}>{children}</span>;
}
```

The hook selects a gray that meets the target ratio when possible. If the target is unreachable, it uses whichever of black or white gives higher contrast. For a translucent RGBA background, the calculation assumes a white surface underneath. Values outside the supported range use the default of 4.5. [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

## Compatibility

React and React DOM 17 or later. The package provides ESM and CommonJS entry points with TypeScript declarations for each. With CommonJS, use `const { useExtractColors } = require("react-extract-colors")`.

## License

MIT · [Jesús Aguilar](https://github.com/jesus-aguiIar) · [License](https://github.com/jesus-aguiIar/react-extract-colors/blob/main/LICENSE.md)
