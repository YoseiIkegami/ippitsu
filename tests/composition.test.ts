import assert from "node:assert/strict";
import test from "node:test";
import { compositionOf } from "../src/composition.ts";

const risingLine = [{ x: 0, y: 390, at: 0 }, { x: 180, y: 300, at: 100 }, { x: 380, y: 180, at: 200 }, { x: 720, y: 40, at: 300 }];

test("横を八つの拍、縦を選んだ音階として読む", () => {
  const composition = compositionOf(risingLine, "hikari", 430);
  assert.equal(composition.length, 802);
  assert.equal(composition.events.length, 8);
  assert.equal(composition.motion, "上がる");
  assert.equal(composition.events[0].role, "入り");
  assert.ok(composition.notes.every((note) => ["C4", "D4", "E4", "G4", "A4", "C5"].includes(note)));
});

test("同じ線でも音階を変えると別の譜面になる", () => {
  const bright = compositionOf(risingLine, "hikari", 430);
  const dusk = compositionOf(risingLine, "yoi", 430);
  assert.notDeepEqual(bright.notes, dusk.notes);
  assert.equal(dusk.scale.name, "D ドリアン");
});

test("点が足りない時は譜面を作らない", () => assert.deepEqual(compositionOf([{ x: 0, y: 0, at: 0 }]).notes, []));
