export interface FontFace {
  family: string;
  weights: number[];
  italic?: boolean | undefined;
}

export function googleFontsHref(faces: FontFace[]): string {
  const families = faces
    .map((f) => {
      const axis = f.italic ? 'ital,wght' : 'wght';
      const values = f.italic
        ? f.weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(';')
        : f.weights.join(';');
      return `family=${encodeURIComponent(f.family)}:${axis}@${values}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
