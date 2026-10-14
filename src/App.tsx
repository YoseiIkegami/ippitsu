import { animated, useSpring } from "@react-spring/web";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Stage } from "react-konva";
import * as Tone from "tone";
import { compositionOf, SCALE_OPTIONS, shapePoints, type Composition, type Point, type ScaleId } from "./composition";

const width = 760;
const height = 430;
const beatDuration = 270;
type Shape = "circle" | "bolt" | "wave";
type StoredLine = { points: Point[]; composition: Composition };

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [previous, setPrevious] = useState<StoredLine | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [sound, setSound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [shape, setShape] = useState<Shape>("circle");
  const [scaleId, setScaleId] = useState<ScaleId>("hikari");
  const pointsRef = useRef<Point[]>([]);
  const previousRef = useRef<StoredLine | null>(null);
  const synth = useRef<Tone.Synth | null>(null);
  const counterSynth = useRef<Tone.Synth | null>(null);
  const timers = useRef<number[]>([]);
  const composition = useMemo(() => compositionOf(points, scaleId, height), [points, scaleId]);
  const flourish = useSpring({ opacity: playing ? 1 : 0, transform: `scale(${playing ? 1 : .65})`, config: { tension: 120, friction: 16 }, immediate: reduced });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      timers.current.forEach(window.clearTimeout);
      synth.current?.dispose();
      counterSynth.current?.dispose();
    };
  }, []);

  async function enableSound() {
    await Tone.start();
    synth.current ??= new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: .018, decay: .15, sustain: .22, release: .7 } }).toDestination();
    counterSynth.current ??= new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: .04, decay: .12, sustain: .12, release: .9 } }).toDestination();
    setSound(true);
  }

  function stop() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    synth.current?.triggerRelease();
    counterSynth.current?.triggerRelease();
    setPlaying(false);
  }

  function play(next: Composition, partner: Composition | null) {
    stop();
    setPlaying(true);
    const velocity = Math.max(.22, Math.min(.62, .23 + next.speed * .24));
    const noteLength = next.expression === "静か" ? "4n" : next.expression === "跳ねる" ? "16n" : "8n";
    next.events.forEach((event, index) => {
      timers.current.push(window.setTimeout(() => synth.current?.triggerAttackRelease(event.note, noteLength, undefined, velocity), 90 + index * beatDuration));
    });
    if (partner) {
      partner.events.forEach((event, index) => {
        const note = Tone.Frequency(event.note).transpose(-5).toNote();
        timers.current.push(window.setTimeout(() => counterSynth.current?.triggerAttackRelease(note, "16n", undefined, .18), 90 + index * beatDuration + beatDuration / 2));
      });
    }
    timers.current.push(window.setTimeout(() => setPlaying(false), 90 + next.events.length * beatDuration + 520));
  }

  function preserveCurrent() {
    if (pointsRef.current.length < 2) return;
    const stored = { points: pointsRef.current, composition };
    previousRef.current = stored;
    setPrevious(stored);
  }

  function perform(line: Point[]) {
    const next = compositionOf(line, scaleId, height);
    pointsRef.current = line;
    setPoints(line);
    if (!next.events.length) return;
    if (sound && synth.current) play(next, previousRef.current?.composition ?? null);
    else {
      setPlaying(true);
      timers.current.push(window.setTimeout(() => setPlaying(false), reduced ? 0 : 1200));
    }
  }

  function pointer(event: { target: { getStage(): { getPointerPosition(): { x: number; y: number } | null } | null } }) {
    const position = event.target.getStage()?.getPointerPosition();
    if (!position) return;
    const next = [...pointsRef.current, { ...position, at: performance.now() }];
    pointsRef.current = next;
    setPoints(next);
  }

  function start(event: { target: { getStage(): { getPointerPosition(): { x: number; y: number } | null } | null } }) {
    stop();
    preserveCurrent();
    pointsRef.current = [];
    setPoints([]);
    setDrawing(true);
    pointer(event);
  }

  function clear() {
    stop();
    pointsRef.current = [];
    previousRef.current = null;
    setPoints([]);
    setPrevious(null);
  }

  function chooseShape(nextShape: Shape) {
    stop();
    preserveCurrent();
    setShape(nextShape);
    perform(shapePoints(nextShape, width, height));
  }

  const flat = points.flatMap(({ x, y }) => [x, y]);
  const previousFlat = previous?.points.flatMap(({ x, y }) => [x, y]) ?? [];

  return <main>
    <section className="shell">
      <a href="https://www.ikg-systems.com/#experiments">← IKG Systems の実験へ</a>
      <header><p>ONE LINE, ONE SMALL ORCHESTRA</p><h1>IPPITSU</h1><span>線を、短い譜面にする。</span></header>
      <section className="scale-picker" aria-labelledby="scale-heading">
        <div><p id="scale-heading">先に音階を選ぶ</p><small>線の縦位置が音の高さになります。</small></div>
        <div className="scale-options">{SCALE_OPTIONS.map((option) => <button key={option.id} onClick={() => setScaleId(option.id)} aria-pressed={scaleId === option.id}><b>{option.label}</b><span>{option.description}</span></button>)}</div>
      </section>
      <div className="controls">
        <button onClick={sound ? () => { stop(); setSound(false); } : enableSound}>{sound ? "音を止める" : "音を入れる"}</button>
        <button onClick={clear}>線を片づける</button>
        <label>動き <input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} /> 少なめ</label>
      </div>
      <div className="canvas-wrap" aria-label="横を拍、縦を音高として線を描く場所">
        <div className="beat-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
        <Stage width={width} height={height} onMouseDown={start} onTouchStart={start} onMouseMove={(event) => { if (drawing) pointer(event); }} onTouchMove={(event) => { if (drawing) pointer(event); }} onMouseUp={() => { if (drawing) { setDrawing(false); perform(pointsRef.current); } }} onTouchEnd={() => { if (drawing) { setDrawing(false); perform(pointsRef.current); } }}>
          <Layer>
            {previous && <Line points={previousFlat} stroke={`hsl(${previous.composition.hue} 52% 70%)`} opacity={.24} strokeWidth={5} lineCap="round" lineJoin="round" />}
            <Line points={flat} stroke={`hsl(${composition.hue} 88% 68%)`} strokeWidth={7} lineCap="round" lineJoin="round" shadowColor={`hsl(${composition.hue} 88% 68%)`} shadowBlur={18} />
          </Layer>
        </Stage>
        <animated.div className="playhead" style={flourish} aria-hidden="true" />
        {!points.length && <p className="instruction">一本、引いてみる。<br /><small>横は拍。縦は選んだ音階の高さ。</small></p>}
      </div>
      <section className="score" aria-live="polite">
        <div className="score-heading"><p>この線の読み方</p>{points.length > 1 && <button disabled={!sound} onClick={() => synth.current && play(composition, previous?.composition ?? null)}>{sound ? "もう一度鳴らす" : "音を入れると鳴らせます"}</button>}</div>
        {points.length > 1 ? <>
          <dl>
            <div><dt>音階</dt><dd>{composition.scale.label} <small>{composition.scale.name}</small></dd></div>
            <div><dt>線の行き先</dt><dd>{composition.motion}</dd></div>
            <div><dt>鳴り方</dt><dd>{composition.expression}</dd></div>
          </dl>
          <ol className="notes">{composition.events.map((event) => <li key={event.beat}><span>{event.beat}</span><b>{event.note}</b><small>{event.role}</small></li>)}</ol>
          <p className="score-note">横の八つの拍をまたぐたび、線の高さを一音にします。折れた場所は、音の言い方を変えます。</p>
          {previous && <p className="duet-note">薄い線は前の一筆です。次に描く線は、その半拍後ろで返事をします。</p>}
        </> : <p className="empty-score">描いたあとに、線がどの音へ変わったかをここに残します。</p>}
      </section>
      <section className="keyboard"><p>描けないときは、形から始める</p>{(["circle", "bolt", "wave"] as Shape[]).map((name) => <button key={name} onClick={() => chooseShape(name)} aria-pressed={shape === name}>{({ circle: "まるを描く", bolt: "いなずまを描く", wave: "なみを描く" })[name]}</button>)}</section>
      <footer>保存しない。一筆は、この場で鳴り終わります。</footer>
    </section>
  </main>;
}
