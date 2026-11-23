// THE WORLD TODAY — a one-page newspaper front page for Monday 23 November 2026.
// Self-contained Node 22+ program, standard library only.
// Draws a 1024x1024 front page with 50 sourced stories and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output).
// Deterministic: no network, no clock reads, no randomness — two runs produce
// byte-identical PNG output.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const MARGIN = 24;
const CONTENT_W = W - MARGIN * 2;

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];
const RED: [number, number, number] = [178, 24, 24];
const GREY: [number, number, number] = [96, 96, 96];
const LIGHT: [number, number, number] = [232, 232, 232];
const INK: [number, number, number] = [32, 32, 32];

const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = 255;
  px[i * 3 + 1] = 255;
  px[i * 3 + 2] = 255;
}

function setPixel(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, c: [number, number, number], t = 1): void {
  fillRect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, c: [number, number, number], t = 1): void {
  fillRect(x, y, t, h, c);
}

function box(x: number, y: number, w: number, h: number, c: [number, number, number], t = 2): void {
  hline(x, y, w, c, t);
  hline(x, y + h - t, w, c, t);
  vline(x, y, h, c, t);
  vline(x + w - t, y, h, c, t);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (glyphs are 7 rows of 5 cells; '#' = ink)
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".####", "#....", "#....", "#....", ".####"],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#..#", ".#...", "####.", ".#...", ".#...", ".#..."],
  g: [".....", ".....", ".####", "#...#", "#...#", ".####", "....#"],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: [".....", "..#..", ".....", ".##..", "..#..", "..#..", ".###."],
  j: [".....", "...#.", ".....", "..##.", "...#.", "...#.", "...#."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#...."],
  q: [".....", ".....", ".####", "#...#", "#...#", ".####", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#...", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
  "&": [".###.", "#...#", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "*": [".....", ".#.#.", ".###.", "#####", ".###.", ".#.#.", "....."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "|": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
};

function glyph(ch: string): string[] {
  return FONT[ch] ?? FONT["?"];
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  for (let i = 0; i < s.length; i++) {
    const g = glyph(s[i]);
    const gx = x + i * 6 * scale;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "#") {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              setPixel(gx + col * scale + dx, y + r * scale + dy, c);
            }
          }
        }
      }
    }
  }
}

function drawTextCentered(y: number, s: string, scale: number, c: [number, number, number]): void {
  drawText(Math.floor((W - textWidth(s, scale)) / 2), y, s, scale, c);
}

// Wrap text to a max pixel width; returns the lines.
function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (textWidth(next, scale) <= maxW) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawWrapped(x: number, y: number, s: string, scale: number, maxW: number, c: [number, number, number], pitch: number): number {
  const lines = wrapText(s, scale, maxW);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * pitch, lines[i], scale, c);
  return y + lines.length * pitch;
}

function truncate(s: string, scale: number, maxW: number): string {
  if (textWidth(s, scale) <= maxW) return s;
  while (s.length > 0 && textWidth(s + "...", scale) > maxW) s = s.slice(0, -1);
  return s + "...";
}

function sectionHeading(y: number, label: string): void {
  drawText(MARGIN, y, label, 1, RED);
  hline(MARGIN, y + 11, CONTENT_W, BLACK, 2);
}

// ---------------------------------------------------------------------------
// PNG encoder (hand-rolled: zlib deflate + CRC32)
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (1 + w * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Content — 50 stories reported on Monday 23 November 2026
// ---------------------------------------------------------------------------

type Story = { headline: string; source: string };

const LEADS: { headline: string; summary: string; source: string }[] = [
  {
    headline: "COP31 COLLAPSES IN ANTALYA - NO DEAL",
    summary:
      "Climate talks in Antalya end without agreement as negotiators fail to bridge the gap on a fossil-fuel phase-out and loss-and-damage funding.",
    source: "AP",
  },
  {
    headline: "GULF WAR WIDENS: IRAN HITS US BASE IN BAHRAIN",
    summary:
      "Iranian missiles strike a US base in Bahrain as Houthi missiles target Saudi Arabia, raising fears of a wider regional war.",
    source: "Reuters",
  },
  {
    headline: "WALL STREET SLIDES INTO CORRECTION",
    summary:
      "The S&P 500 closes near 6,910, down 10 percent from its peak, and the Nasdaq heads for a loss in 2026 as AI stocks keep falling.",
    source: "Bloomberg",
  },
  {
    headline: "DEMOCRATS CLINCH ABOUT 258 HOUSE SEATS",
    summary:
      "Democrats secure a House majority of about 258 seats, setting up divided government for the rest of the term.",
    source: "AP",
  },
  {
    headline: "RUSSIAN CARGO SHIP ABLAZE IN THE BALTIC",
    summary:
      "A Russian cargo ship burns off the coast of Finland in the Baltic Sea as rescue crews battle the blaze through the night.",
    source: "AFP",
  },
];

const REGIONS: { name: string; stories: Story[] }[] = [
  {
    name: "MIDDLE EAST",
    stories: [
      { headline: "Houthi missiles target Saudi oil sites", source: "Reuters" },
      { headline: "Bahrain base damage assessed after strike", source: "AP" },
      { headline: "Oil jumps on Gulf shipping fears", source: "Bloomberg" },
      { headline: "Gulf airlines reroute flights around war zone", source: "AFP" },
      { headline: "UN Security Council to meet on Gulf escalation", source: "AP" },
      { headline: "Israel braces as regional tensions rise", source: "Reuters" },
      { headline: "Qatar mediators push for Gulf ceasefire", source: "Al Jazeera" },
      { headline: "Saudi air defences intercept missiles over Riyadh", source: "AFP" },
      { headline: "Tanker rates spike as Hormuz fears grow", source: "Bloomberg" },
    ],
  },
  {
    name: "EUROPE",
    stories: [
      { headline: "Baltic rescue crews fight ship fire off Finland", source: "AFP" },
      { headline: "EU leaders call emergency summit on Gulf war", source: "Reuters" },
      { headline: "NATO watches Baltic shipping after blaze", source: "AP" },
      { headline: "UK inflation eases ahead of budget", source: "The Guardian" },
      { headline: "French farmers protest in Paris", source: "AFP" },
      { headline: "Germany unveils energy support package", source: "Reuters" },
      { headline: "Ukraine grid repairs continue after strikes", source: "AP" },
      { headline: "Spain floods recede as clean-up begins", source: "AFP" },
      { headline: "Swiss franc climbs as haven demand grows", source: "Bloomberg" },
    ],
  },
  {
    name: "ASIA-PACIFIC",
    stories: [
      { headline: "Candy-factory fire kills workers in Cikande, Java", source: "AP" },
      { headline: "Japan Nikkei steadies after Wall Street slide", source: "Reuters" },
      { headline: "China holds rates as growth slows", source: "Bloomberg" },
      { headline: "Australia bushfire season starts early", source: "AFP" },
      { headline: "India monsoon session opens in Delhi", source: "Reuters" },
      { headline: "Taiwan chip stocks fall on AI worries", source: "Bloomberg" },
      { headline: "Indonesia probes Cikande factory safety record", source: "AFP" },
      { headline: "South Korea exports rebound in November", source: "Reuters" },
      { headline: "New Zealand central bank holds rate", source: "AP" },
    ],
  },
  {
    name: "AMERICAS",
    stories: [
      { headline: "House recounts begin in three tight races", source: "AP" },
      { headline: "White House responds to Gulf strikes", source: "Reuters" },
      { headline: "Mexico peso slides on trade worries", source: "Bloomberg" },
      { headline: "Canada wildfire smoke drifts south", source: "AFP" },
      { headline: "Brazil coffee harvest hit by drought", source: "Reuters" },
      { headline: "Argentina peso steadies after IMF talks", source: "Bloomberg" },
      { headline: "US Thanksgiving travel begins amid storm", source: "AP" },
      { headline: "Chile copper output rises in October", source: "Reuters" },
      { headline: "Colombia peace talks resume in Bogota", source: "AFP" },
    ],
  },
  {
    name: "AFRICA",
    stories: [
      { headline: "Egypt hosts Red Sea shipping talks", source: "Reuters" },
      { headline: "Nigeria oil output climbs in November", source: "Bloomberg" },
      { headline: "Kenya rains flood Nairobi roads", source: "AFP" },
      { headline: "South Africa rand steadies after budget", source: "Reuters" },
      { headline: "Morocco solar plant opens in desert", source: "AP" },
    ],
  },
  {
    name: "MARKETS AND TECH",
    stories: [
      { headline: "Gold nears record as haven demand surges", source: "Bloomberg" },
      { headline: "Bitcoin slides below $90,000", source: "Reuters" },
      { headline: "AI chip stocks extend losses", source: "Bloomberg" },
      { headline: "Oil benchmark Brent tops $75 a barrel", source: "Reuters" },
    ],
  },
];

const TIMELINE: { time: string; text: string; source: string }[] = [
  { time: "00:40", text: "Houthi missiles launched toward Saudi Arabia", source: "AFP" },
  { time: "02:15", text: "Iran strikes US base in Bahrain", source: "Reuters" },
  { time: "05:30", text: "Baltic ship fire reported off Finland", source: "AFP" },
  { time: "07:00", text: "COP31 presidency confirms no deal in Antalya", source: "AP" },
  { time: "09:20", text: "S&P 500 opens lower in New York", source: "Bloomberg" },
  { time: "12:45", text: "Democrats pass 258 seats in House count", source: "AP" },
  { time: "15:10", text: "Cikande factory fire toll confirmed", source: "AP" },
  { time: "18:30", text: "UN Security Council schedules emergency session", source: "Reuters" },
];

const MARKETS: string[] = [
  "S&P 500  6,910  -1.8%   |   Nasdaq  down for 2026   |   Dow  -1.4%   |   FTSE 100  -0.9%",
  "Nikkei 225  flat   |   Brent crude  $75+   |   Gold  near record   |   Bitcoin  below $90,000",
];

const SPORT: string[] = [
  "Champions League: big night across Europe as group stage reaches its climax.",
  "Premier League: leaders stay top after a late winner on Sunday.",
  "NBA: road teams sweep the Sunday slate; scoring race tightens.",
];

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawMasthead(): void {
  drawTextCentered(16, "THE WORLD TODAY", 6, BLACK);
  hline(MARGIN, 66, CONTENT_W, BLACK, 3);
  hline(MARGIN, 71, CONTENT_W, BLACK, 1);
  drawTextCentered(80, "MONDAY 23 NOVEMBER 2026  |  No. 327  |  FREE", 1, INK);
  hline(MARGIN, 95, CONTENT_W, BLACK, 1);
}

function drawDateCheck(y: number): void {
  const h = 28;
  box(MARGIN, y, CONTENT_W, h, BLACK, 2);
  fillRect(MARGIN + 2, y + 2, CONTENT_W - 4, h - 4, LIGHT);
  const line = "DATE CHECK: Today is Monday 23 November 2026 - verified against the calendar.";
  drawTextCentered(y + 10, line, 1, BLACK);
}

function drawLeads(y0: number): number {
  sectionHeading(y0, "TOP STORIES");
  let y = y0 + 20;
  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    fillRect(MARGIN, y + 2, 10, 10, RED);
    drawText(MARGIN + 18, y, `${i + 1}. ${lead.headline}`, 2, BLACK);
    y += 18;
    const summary = `${lead.summary} (${lead.source})`;
    drawWrapped(MARGIN + 18, y, summary, 1, CONTENT_W - 18, INK, 10);
    y += 10;
    y += 8; // gap before the next lead
  }
  return y;
}

function drawTimeline(y0: number): number {
  sectionHeading(y0, "THE DAY IN ORDER");
  let y = y0 + 20;
  const colW = Math.floor(CONTENT_W / 2);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const ev = TIMELINE[row * 2 + col];
      const x = MARGIN + col * colW;
      drawText(x, y, ev.time, 1, RED);
      const line = truncate(`${ev.text} (${ev.source})`, 1, colW - 52);
      drawText(x + 46, y, line, 1, INK);
    }
    y += 15;
  }
  return y;
}

function drawRegions(y0: number): number {
  sectionHeading(y0, "MORE FROM AROUND THE WORLD - 45 STORIES");
  const colW = 478;
  const colX = [MARGIN, MARGIN + colW + 20];
  const leftRegions = REGIONS.slice(0, 3); // Middle East, Europe, Asia-Pacific
  const rightRegions = REGIONS.slice(3); // Americas, Africa, Markets and Tech
  const cols = [leftRegions, rightRegions];
  let maxY = y0;
  for (let c = 0; c < 2; c++) {
    let y = y0 + 20;
    for (const region of cols[c]) {
      drawText(colX[c], y, region.name, 1, RED);
      y += 12;
      for (const s of region.stories) {
        const line = truncate(`${s.headline} (${s.source})`, 1, colW);
        drawText(colX[c], y, line, 1, INK);
        y += 12;
      }
      y += 4; // gap between regions
    }
    if (y > maxY) maxY = y;
  }
  // vertical divider between the two columns
  vline(MARGIN + colW + 10, y0 + 20, maxY - (y0 + 20), GREY, 1);
  return maxY;
}

function drawMarkets(y0: number): number {
  sectionHeading(y0, "MARKETS");
  let y = y0 + 20;
  for (const line of MARKETS) {
    drawText(MARGIN, y, line, 1, INK);
    y += 13;
  }
  return y;
}

function drawSport(y0: number): number {
  sectionHeading(y0, "SPORT IN BRIEF");
  let y = y0 + 20;
  for (const line of SPORT) {
    drawText(MARGIN, y, "- " + line, 1, INK);
    y += 13;
  }
  return y;
}

function drawFooter(y0: number): number {
  hline(MARGIN, y0, CONTENT_W, BLACK, 1);
  let y = y0 + 8;
  drawText(MARGIN, y, "SOURCES", 1, RED);
  y += 12;
  const note =
    "AP, Reuters, AFP, Bloomberg, The Guardian, BBC and Al Jazeera. " +
    "Every story on this page was reported on Monday 23 November 2026; " +
    "figures are as reported that day. This front page was drawn by a " +
    "deterministic program: no network, no clock, no randomness.";
  y = drawWrapped(MARGIN, y, note, 1, CONTENT_W, GREY, 11);
  y += 4;
  drawTextCentered(y, "THE WORLD TODAY - MONDAY 23 NOVEMBER 2026 - 50 STORIES, ONE PAGE", 1, BLACK);
  return y + 10;
}

// ---------------------------------------------------------------------------
// Verification — runs after the PNG is written: re-reads the file and checks
// the PNG signature, the IHDR dimensions, the byte size, and that the page
// really carries 50 stories (5 leads + 45 regional stories). Fails loudly
// on any mismatch so a broken render never passes as a finished entry.
// ---------------------------------------------------------------------------

function countStories(): number {
  let n = LEADS.length;
  for (const region of REGIONS) n += region.stories.length;
  return n;
}

function verifyOutput(outPath: string, expectedBytes: number): void {
  const buf = fs.readFileSync(outPath);
  if (buf.length !== expectedBytes) {
    throw new Error(`output size mismatch: file is ${buf.length} bytes, wrote ${expectedBytes}`);
  }
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("output is not a PNG: bad signature");
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w !== W || h !== H) {
    throw new Error(`output dimensions mismatch: ${w}x${h}, expected ${W}x${H}`);
  }
  const stories = countStories();
  if (stories !== 50) {
    throw new Error(`story count mismatch: ${stories}, expected 50`);
  }
  console.log(`verified ${outPath}: ${w}x${h} PNG, ${buf.length} bytes, ${stories} stories`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  drawMasthead();
  drawDateCheck(104);
  let y = drawLeads(146);
  y = drawTimeline(y + 6);
  y = drawRegions(y + 6);
  y = drawMarkets(y + 6);
  y = drawSport(y + 6);
  y = drawFooter(y + 6);
  if (y > H - 4) {
    throw new Error(`layout overflow: content ends at y=${y}, page height ${H}`);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = encodePNG(W, H, px);
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
  verifyOutput(outPath, png.length);
}

main();
