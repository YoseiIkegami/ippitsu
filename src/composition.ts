export type Point = { x: number; y: number; at: number };
export type ScaleId = "hikari" | "yoi" | "nagi" | "mori";
export type NoteRole = "入り" | "上行" | "下行" | "折れ" | "留め" | "戻り";

export const SCALE_OPTIONS: { id: ScaleId; label: string; description: string; name: string; hue: number; fallback: string[] }[] = [
  { id: "hikari", label: "ひらく", description: "少しずつ上へ向かう五つの音", name: "C メジャー・ペンタトニック", hue: 46, fallback: ["C4", "D4", "E4", "G4", "A4", "C5"] },
  { id: "yoi", label: "よい", description: "戻り道をつくる七つの音", name: "D ドリアン", hue: 274, fallback: ["D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"] },
  { id: "nagi", label: "なぎ", description: "間を残す五つの音", name: "A マイナー・ペンタトニック", hue: 196, fallback: ["A3", "C4", "D4", "E4", "G4", "A4"] },
  { id: "mori", label: "もり", description: "少し影のある七つの音", name: "E フリジアン", hue: 132, fallback: ["E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"] },
];

export type ScoreEvent = { beat: number; note: string; role: NoteRole };

export type Composition = {
  length: number;
  speed: number;
  hue: number;
  notes: string[];
  events: ScoreEvent[];
  scale: (typeof SCALE_OPTIONS)[number];
  motion: "上がる" | "下がる" | "折り返す" | "戻る" | "とどまる";
  expression: "静か" | "ほどける" | "跳ねる";
};

function notesFor(scale: (typeof SCALE_OPTIONS)[number]) {
  return scale.fallback;
}

function pointNear(points: Point[], x: number) {
  return points.reduce((nearest, point) => Math.abs(point.x - x) < Math.abs(nearest.x - x) ? point : nearest);
}

function roleOf(index: number, notes: number[], isClosed: boolean): NoteRole {
  if (index === 0) return "入り";
  if (isClosed && index === notes.length - 1) return "戻り";
  const previous = notes[index - 1];
  const beforePrevious = notes[index - 2] ?? previous;
  const current = notes[index];
  if (Math.sign(current - previous) !== Math.sign(previous - beforePrevious) && current !== previous && previous !== beforePrevious) return "折れ";
  if (current === previous) return "留め";
  return current > previous ? "上行" : "下行";
}

export function compositionOf(points: Point[], scaleId: ScaleId = "hikari", height = 430): Composition {
  const scale = SCALE_OPTIONS.find((option) => option.id === scaleId) ?? SCALE_OPTIONS[0];
  if (points.length < 2) return { length: 0, speed: 0, hue: scale.hue, notes: [], events: [], scale, motion: "とどまる", expression: "静か" };
  const length = points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  const duration = Math.max(points.at(-1)!.at - points[0].at, 80);
  const speed = length / duration;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const span = Math.max(maxX - minX, 1);
  const palette = notesFor(scale);
  const pitchIndexes = Array.from({ length: 8 }, (_, index) => {
    const point = pointNear(points, minX + span * index / 7);
    return Math.round(Math.max(0, Math.min(1, 1 - point.y / height)) * (palette.length - 1));
  });
  const pitchDelta = pitchIndexes.at(-1)! - pitchIndexes[0];
  const turns = pitchIndexes.slice(2).filter((pitch, index) => {
    const change = Math.sign(pitch - pitchIndexes[index + 1]);
    const prior = Math.sign(pitchIndexes[index + 1] - pitchIndexes[index]);
    return change !== 0 && prior !== 0 && change !== prior;
  }).length;
  const isClosed = Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) < Math.max(54, length * .16);
  const motion = isClosed ? "戻る" : turns >= 2 ? "折り返す" : pitchDelta >= 2 ? "上がる" : pitchDelta <= -2 ? "下がる" : "とどまる";
  const expression = turns >= 2 ? "跳ねる" : speed < .38 ? "静か" : "ほどける";
  const events = pitchIndexes.map((pitch, index) => ({ beat: index + 1, note: palette[pitch], role: roleOf(index, pitchIndexes, isClosed) }));
  return { length: Math.round(length), speed, hue: (scale.hue + turns * 9) % 360, notes: events.map((event) => event.note), events, scale, motion, expression };
}

export function shapePoints(shape: "circle" | "bolt" | "wave", width: number, height: number): Point[] {
  const now = performance.now();
  if (shape === "bolt") return [[.15, .2], [.56, .2], [.39, .5], [.75, .5], [.28, .84]].map(([x, y], index) => ({ x: x * width, y: y * height, at: now + index * 110 }));
  return Array.from({ length: 28 }, (_, index) => {
    const t = index / 27;
    return shape === "circle"
      ? { x: width * (.5 + Math.cos(t * Math.PI * 2) * .26), y: height * (.5 + Math.sin(t * Math.PI * 2) * .26), at: now + index * 35 }
      : { x: width * (.1 + t * .8), y: height * (.5 + Math.sin(t * Math.PI * 4) * .2), at: now + index * 35 };
  });
}
