import { animated, useSpring } from "@react-spring/web";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Stage } from "react-konva";
import * as Tone from "tone";
import { compositionOf, shapePoints, type Point } from "./composition";

const width = 760;
const height = 430;
type Shape = "circle" | "bolt" | "wave";

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [sound, setSound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [shape, setShape] = useState<Shape>("circle");
  const synth = useRef<Tone.Synth | null>(null);
  const composition = useMemo(() => compositionOf(points), [points]);
  const flourish = useSpring({ opacity: playing ? 1 : 0, transform: `scale(${playing ? 1 : .65})`, config: { tension: 120, friction: 16 }, immediate: reduced });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply(); media.addEventListener("change", apply);
    return () => { media.removeEventListener("change", apply); synth.current?.dispose(); };
  }, []);

  async function enableSound() {
    await Tone.start();
    synth.current ??= new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: .015, decay: .18, sustain: .12, release: .8 } }).toDestination();
    setSound(true);
  }

  function stop() {
    Tone.Transport.cancel();
    synth.current?.triggerRelease();
    setPlaying(false);
  }

  function perform(line: Point[]) {
    const next = compositionOf(line);
    setPoints(line); setPlaying(true);
    if (!reduced) window.setTimeout(() => setPlaying(false), 1350);
    else setPlaying(false);
    if (sound && synth.current && next.notes.length) {
      stop(); setPlaying(true);
      next.notes.forEach((note, index) => synth.current?.triggerAttackRelease(note, "16n", Tone.now() + index * .11, .16 + index * .05));
      window.setTimeout(() => setPlaying(false), next.notes.length * 110 + 500);
    }
  }

  function pointer(event: { target: { getStage(): { getPointerPosition(): { x: number; y: number } | null } | null } }) {
    const position = event.target.getStage()?.getPointerPosition();
    if (!position) return;
    setPoints((current) => [...current, { ...position, at: performance.now() }]);
  }

  function start(event: { target: { getStage(): { getPointerPosition(): { x: number; y: number } | null } | null } }) {
    stop(); setPlaying(false); setPoints([]); setDrawing(true); pointer(event);
  }

  const flat = points.flatMap(({ x, y }) => [x, y]);
  const sparkles = Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--x": `${8 + (index * 37) % 82}%`, "--y": `${14 + (index * 53) % 70}%`, "--d": `${(index % 5) * 80}ms` } as React.CSSProperties} />);

  return <main>
    <section className="shell">
      <a href="https://www.ikg-systems.com/#experiments">← IKG Systems の実験へ</a>
      <header><p>ONE LINE, ONE SMALL ORCHESTRA</p><h1>IPPITSU</h1><span>きょうの線を、一本だけ。</span></header>
      <div className="controls">
        <button onClick={sound ? () => { stop(); setSound(false); } : enableSound}>{sound ? "音を止める" : "音を鳴らす"}</button>
        <button onClick={() => { stop(); setPoints([]); }}>線を消す</button>
        <label>動き <input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} /> 少なめ</label>
      </div>
      <div className="canvas-wrap" aria-label="ここに線を描く">
        <Stage width={width} height={height} onMouseDown={start} onTouchStart={start} onMouseMove={(event) => { if (drawing) pointer(event); }} onTouchMove={(event) => { if (drawing) pointer(event); }} onMouseUp={() => { if (drawing) { setDrawing(false); perform(points); } }} onTouchEnd={() => { if (drawing) { setDrawing(false); perform(points); } }}>
          <Layer><Line points={flat} stroke={`hsl(${composition.hue} 88% 68%)`} strokeWidth={7} lineCap="round" lineJoin="round" shadowColor={`hsl(${composition.hue} 88% 68%)`} shadowBlur={18} /></Layer>
        </Stage>
        <animated.div className="sparkles" style={flourish} aria-hidden="true">{sparkles}</animated.div>
        {!points.length && <p className="instruction">ここをなぞる<br /><small>速く、ゆっくり、まるく、乱暴に。</small></p>}
      </div>
      <div className="after">
        <div><b>{points.length ? `${composition.length} px` : "—"}</b><span>線の長さ</span></div><div><b>{points.length ? composition.notes.length : "—"}</b><span>音の粒</span></div><div><b>{points.length ? `${composition.hue}°` : "—"}</b><span>きょうの色</span></div>
      </div>
      <section className="keyboard"><p>キーボードで線を選ぶ</p>{(["circle", "bolt", "wave"] as Shape[]).map((name) => <button key={name} onClick={() => { setShape(name); perform(shapePoints(name, width, height)); }} aria-pressed={shape === name}>{({ circle: "まる", bolt: "いなずま", wave: "なみ" })[name]}</button>)}</section>
      <footer>保存しない。その日の一筆は、その場で終演します。</footer>
    </section>
  </main>;
}
