import assert from "node:assert/strict";
import test from "node:test";
import { compositionOf } from "../src/composition.ts";

test("線の長さと速さから演奏を作る", () => {
  const composition = compositionOf([{ x: 0, y: 0, at: 0 }, { x: 30, y: 40, at: 100 }, { x: 60, y: 40, at: 200 }]);
  assert.equal(composition.length, 80);
  assert.equal(composition.notes.length, 3);
  assert.ok(composition.speed > 0);
});

test("点が足りない時は音を作らない", () => assert.deepEqual(compositionOf([{ x: 0, y: 0, at: 0 }]).notes, []));
