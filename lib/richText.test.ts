import { describe, expect, it } from "vitest";
import {
  htmlToPlainText,
  isRichTextEmpty,
  looksLikeRichText,
  plainTextToHtml,
  renderRichText,
} from "./richText";

describe("looksLikeRichText (must match backend utils.LooksLikeRichText)", () => {
  it.each([
    ["<p>x</p>", true],
    [" \n<ul><li>x</li></ul>", true],
    ["<OL><li>x</li></OL>", true],
    ["hello <p>", false],
    ["1 < 2", false],
    ["<script>alert(1)</script>", false],
    ["", false],
  ])("%j → %s", (input, want) => {
    expect(looksLikeRichText(input)).toBe(want);
  });
});

describe("legacy plain text", () => {
  it("is escaped and split into paragraphs", () => {
    expect(plainTextToHtml("a & b\n<b>x</b>")).toBe("<p>a &amp; b</p><p>&lt;b&gt;x&lt;/b&gt;</p>");
  });
  it("renderRichText never lets plain text inject markup", () => {
    expect(renderRichText("<img src=x onerror=alert(1)>")).not.toContain("<img");
    expect(renderRichText("hi <script>alert(1)</script>")).not.toContain("<script");
  });
  it("empty stays empty", () => {
    expect(renderRichText("  ")).toBe("");
    expect(renderRichText(null)).toBe("");
  });
});

describe("htmlToPlainText", () => {
  it("strips tags, keeps line structure and decodes entities", () => {
    expect(htmlToPlainText("<p>Net <strong>30</strong></p><ul><li>a &amp; b</li></ul>")).toBe("Net 30\na & b");
  });
  it("passes legacy plain text through untouched", () => {
    expect(htmlToPlainText("a < b")).toBe("a < b");
  });
  it("isRichTextEmpty treats an emptied editor as empty", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("<p>x</p>")).toBe(false);
  });
});

describe("renderRichText without a DOM (SSR)", () => {
  it("degrades to escaped text — script never survives", () => {
    const out = renderRichText('<p>ok</p><script>alert(1)</script><p onclick="x()">y</p>');
    expect(out).not.toMatch(/<script|onclick/i);
    expect(out).toContain("ok");
  });
});
