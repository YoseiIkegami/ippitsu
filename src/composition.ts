export type Point = { x: number; y: number; at: number };

export function compositionOf(points: Point[]) {
  if (points.length < 2) return { length: 0, speed: 0, hue: 270, notes: [] as string[] };
  const length = points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  const duration = Math.max(points.at(-1)!.at - points[0].at, 80);
  const speed = length / duration;
  const hue = Math.round((points[0].x * 0.9 + points.at(-1)!.y * 0.7 + length) % 360);
  const scale = ["C4", "D4", "E4", "G4", "A4", "C5", "D5"];
  const count = Math.max(3, Math.min(7, Math.round(length / 85)));
  const offset = Math.round(speed * 13 + hue / 60) % scale.length;
  return { length: Math.round(length), speed, hue, notes: Array.from({ length: count }, (_, index) => scale[(offset + index * 2) % scale.length]) };
}

export function shapePoints(shape: "circle" | "bolt" | "wave", width: number, height: number): Point[] {
  const now = performance.now();
  if (shape === "bolt") return [[.15,.2],[.56,.2],[.39,.5],[.75,.5],[.28,.84]].map(([x,y], index) => ({ x: x * width, y: y * height, at: now + index * 110 }));
  return Array.from({ length: 28 }, (_, index) => {
    const t = index / 27;
    return shape === "circle"
      ? { x: width * (.5 + Math.cos(t * Math.PI * 2) * .26), y: height * (.5 + Math.sin(t * Math.PI * 2) * .26), at: now + index * 35 }
      : { x: width * (.1 + t * .8), y: height * (.5 + Math.sin(t * Math.PI * 4) * .2), at: now + index * 35 };
  });
}
