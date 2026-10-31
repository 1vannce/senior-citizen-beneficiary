import { describe, expect, it } from "vitest";
import { cosineSimilarity, findMatch } from "@/lib/face";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for orthogonal ones", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it("returns 0 for mismatched or empty vectors", () => {
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("findMatch", () => {
  const people = [
    { id: "a", embedding: [1, 0, 0] },
    { id: "b", embedding: [0, 1, 0] },
  ];
  it("matches the closest record above the threshold", () => {
    expect(findMatch([0.9, 0.1, 0], people, 0.55)).toMatchObject({ status: "MATCH", best: { id: "a" } });
  });
  it("reports no match below the threshold (T14)", () => {
    expect(findMatch([0, 0, 1], people, 0.55).status).toBe("NO_MATCH");
  });
  it("reports no match with no saved faces", () => {
    expect(findMatch([1, 0, 0], [], 0.55)).toEqual({ status: "NO_MATCH", best: null });
  });
  it("flags two near-equal candidates as ambiguous", () => {
    const close = [...people, { id: "c", embedding: [0.99, 0.05, 0] }];
    expect(findMatch([1, 0.02, 0], close, 0.55).status).toBe("AMBIGUOUS");
  });
});
