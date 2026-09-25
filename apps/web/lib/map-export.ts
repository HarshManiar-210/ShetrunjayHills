import { basemapById, type BasemapId } from "@/lib/basemaps";
import { legendFor, rampScale } from "@/lib/legend-config";
import { fetchRasterStats, nameClasses, type NamedClassStat } from "@/lib/raster-stats-api";
import { STUDY_AREA_HA, countByLayer } from "@/lib/vector-stats";
import type { StatsRasterLayer } from "@/components/StatsPanel";
import type { LegendOverlay, LegendRasterLayer } from "@/components/LegendCard";
import type { SwatchGeometryKind } from "@/components/LayerSwatch";
import type { LayerFeature } from "@/lib/layers-api";
import { geometryKindOf } from "@/lib/sections";

/**
 * Exports the dashboard as one sheet — the map exactly as it is on screen,
 * with the legend and the statistics beside it — as either a PNG file or a
 * PDF.
 *
 * Both come from the same composed canvas. The PNG is downloaded directly;
 * the PDF goes through the browser's own print pipeline, which is what turns
 * it into a PDF without a PDF library and leaves the user the page size and
 * destination controls they already know.
 *
 * Printing the live page was the obvious alternative to composing one, and a
 * worse one: the dashboard is a full-height flex layout with the map on a
 * WebGL canvas and both panels floating over it in their own scroll
 * containers, so print laid it out in ways no stylesheet could reliably
 * rescue.
 *
 * Composing rather than screenshotting also means the sheet always carries
 * the *whole* legend and the whole statistics table. A capture of the DOM
 * would export whatever happened to be scrolled into view, and a panel
 * someone had collapsed would come out empty — which is exactly the legend
 * they are exporting the map for.
 *
 * The map itself is the real WebGL canvas, drawn at its own pixel size so
 * nothing is resampled. That needs `preserveDrawingBuffer` on the map (set in
 * Map.tsx) — without it the buffer is discarded after each frame and reads
 * back blank.
 */

/** Everything the sheet is drawn from — the same props the two panels take. */
export interface ExportInput {
  mapCanvas: HTMLCanvasElement;
  basemap: BasemapId;
  centre: { lat: number; lng: number };
  zoom: number;
  /** Switched-on role-permissioned layers, as features. */
  layers: LayerFeature[];
  /** Switched-on vector static overlays. */
  overlays: LegendOverlay[];
  /** Switched-on raster themes, for the legend. */
  rasterLegends: LegendRasterLayer[];
  /** The same themes, plus the image each is showing, for the statistics. */
  rasterStats: StatsRasterLayer[];
}

const COUNT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * A light sheet, not the app's dark theme: this is a document to print,
 * attach to a report or drop into a slide, and dark chrome fights all three.
 * The data colours are of course the map's own.
 */
const PAPER = "#FFFFFF";
const INK = "#1A1A18";
const MUTED = "#6B6B66";
const FAINT = "#9A9A93";
const RULE = "#E2E2DD";
const PANEL = "#F7F7F4";

const PAD = 24;
const GAP = 20;
const SIDEBAR = 304;
/** Padding inside a legend column, and the gap between two of them. */
const COL_INSET = 12;
const COL_GAP = 12;
/**
 * Past three columns the sheet is wider than any sane page, so a legend long
 * enough to need a fourth makes the page taller instead.
 */
const MAX_COLUMNS = 3;
const HEADER_H = 52;
const FOOTER_H = 26;
const SWATCH = 10;

type Ctx = CanvasRenderingContext2D;

/** Drawing position within the sidebar column, in CSS pixels. */
interface Cursor {
  ctx: Ctx;
  x: number;
  w: number;
  y: number;
  /** Measure-only pass: advance the cursor, draw nothing. */
  dry: boolean;
  font: string;
}

function setFont(c: Cursor, size: number, weight = 400) {
  c.ctx.font = `${weight} ${size}px ${c.font}`;
}

/** Truncates to the available width with an ellipsis, as the panels do. */
function clip(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxW) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function sectionHeading(c: Cursor, text: string) {
  setFont(c, 9, 600);
  if (!c.dry) {
    c.ctx.fillStyle = FAINT;
    c.ctx.textAlign = "left";
    c.ctx.fillText(text.toUpperCase(), c.x, c.y + 7);
    c.ctx.strokeStyle = RULE;
    c.ctx.lineWidth = 1;
    c.ctx.beginPath();
    c.ctx.moveTo(c.x, c.y + 13.5);
    c.ctx.lineTo(c.x + c.w, c.y + 13.5);
    c.ctx.stroke();
  }
  c.y += 22;
}

function themeTitle(c: Cursor, name: string, suffix?: string) {
  setFont(c, 11.5, 600);
  if (!c.dry) {
    c.ctx.textAlign = "left";
    const label = suffix ? `${name} · ${suffix}` : name;
    c.ctx.fillStyle = INK;
    c.ctx.fillText(clip(c.ctx, label, c.w), c.x, c.y + 9);
  }
  c.y += 16;
}

/**
 * One swatch and a label, with an optional right-aligned value — the shape
 * every row in both panels takes.
 */
function swatchRow(
  c: Cursor,
  color: string,
  kind: SwatchGeometryKind,
  label: string,
  right?: string,
  rightWidth = 0,
) {
  const textX = c.x + SWATCH + 6;
  setFont(c, 10);
  if (!c.dry) {
    drawSwatch(c.ctx, c.x, c.y + 1, color, kind);
    c.ctx.textAlign = "left";
    c.ctx.fillStyle = INK;
    c.ctx.fillText(clip(c.ctx, label, c.x + c.w - textX - rightWidth), textX, c.y + 8);
    if (right) {
      c.ctx.textAlign = "right";
      c.ctx.fillStyle = MUTED;
      c.ctx.fillText(right, c.x + c.w, c.y + 8);
    }
  }
  c.y += 14;
}

function keyValue(c: Cursor, key: string, value: string) {
  setFont(c, 10);
  if (!c.dry) {
    c.ctx.textAlign = "left";
    c.ctx.fillStyle = MUTED;
    c.ctx.fillText(key, c.x, c.y + 8);
    setFont(c, 10, 600);
    c.ctx.textAlign = "right";
    c.ctx.fillStyle = INK;
    c.ctx.fillText(value, c.x + c.w, c.y + 8);
  }
  c.y += 14;
}

function note(c: Cursor, text: string) {
  setFont(c, 8.5);
  const lines = wrap(c.ctx, text, c.w);
  if (!c.dry) {
    c.ctx.textAlign = "left";
    c.ctx.fillStyle = FAINT;
    lines.forEach((line, i) => c.ctx.fillText(line, c.x, c.y + 7 + i * 10));
  }
  c.y += lines.length * 10 + 2;
}

function emptyLine(c: Cursor, text: string) {
  setFont(c, 9.5);
  if (!c.dry) {
    c.ctx.textAlign = "left";
    c.ctx.fillStyle = FAINT;
    c.ctx.fillText(clip(c.ctx, text, c.w), c.x, c.y + 7);
  }
  c.y += 14;
}

/**
 * The gradient bar, its ends named and — where the theme's classes really are
 * equal steps — its ticks. Hard stops, matching the screen: the imagery is
 * classified, so a blend would show colours the map does not contain.
 */
function gradientBar(
  c: Cursor,
  colors: string[],
  low: string,
  high: string,
  ticks?: string[],
) {
  const H = 9;
  if (!c.dry) {
    const step = c.w / colors.length;
    colors.forEach((color, i) => {
      c.ctx.fillStyle = color;
      c.ctx.fillRect(c.x + i * step, c.y, step + 0.5, H);
    });
    c.ctx.strokeStyle = "rgba(0,0,0,0.14)";
    c.ctx.lineWidth = 1;
    c.ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, H - 1);
  }
  c.y += H + 3;

  if (ticks) {
    setFont(c, 8, 600);
    if (!c.dry) {
      const step = c.w / ticks.length;
      c.ctx.fillStyle = MUTED;
      c.ctx.textAlign = "center";
      ticks.forEach((tick, i) => c.ctx.fillText(tick, c.x + step * (i + 0.5), c.y + 7));
    }
    c.y += 11;
  }

  setFont(c, 8.5);
  if (!c.dry) {
    c.ctx.fillStyle = MUTED;
    const half = (c.w - 8) / 2;
    c.ctx.textAlign = "left";
    c.ctx.fillText(clip(c.ctx, low, half), c.x, c.y + 7);
    c.ctx.textAlign = "right";
    c.ctx.fillText(clip(c.ctx, high, half), c.x + c.w, c.y + 7);
  }
  c.y += 13;
}

/**
 * The legend's shape vocabulary, drawn rather than styled — the canvas
 * counterpart of LayerSwatch, and deliberately the same five shapes, so a
 * sheet reads the same as the screen it came from.
 */
function drawSwatch(ctx: Ctx, x: number, y: number, color: string, kind: SwatchGeometryKind) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (kind === "point") {
    ctx.beginPath();
    ctx.arc(x + SWATCH / 2, y + SWATCH / 2, SWATCH / 2 - 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "line") {
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + SWATCH / 2);
    ctx.lineTo(x + SWATCH, y + SWATCH / 2);
    ctx.stroke();
  } else if (kind === "polygon-outline") {
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, SWATCH - 1.5, SWATCH - 1.5);
  } else if (kind === "polygon") {
    // A wash inside a solid edge, as the map paints it. Opaque it would be
    // the same block a raster class gets, and a legend carrying both a
    // boundary and a cover class would show one colour twice.
    ctx.globalAlpha = 0.32;
    ctx.fillRect(x, y, SWATCH, SWATCH);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, SWATCH - 1.5, SWATCH - 1.5);
  } else {
    // A raster class: opaque pixels, so an opaque block.
    ctx.fillRect(x, y, SWATCH, SWATCH);
  }

  ctx.restore();
}

/** A raster theme's measured classes, or why there are none. */
interface MeasuredRaster {
  layer: StatsRasterLayer;
  areaSqM: number | null;
  classes: NamedClassStat[];
  message?: string;
}

async function measure(rasterStats: StatsRasterLayer[]): Promise<MeasuredRaster[]> {
  return Promise.all(
    rasterStats.map(async (layer) => {
      try {
        const stats = await fetchRasterStats(layer.imageKey);
        if (stats.photographic) {
          return {
            layer,
            areaSqM: stats.area_sq_m,
            classes: [],
            message: "Photographic image — no classes to summarise",
          };
        }
        return {
          layer,
          areaSqM: stats.area_sq_m,
          classes: nameClasses(layer.id, stats.classes ?? []),
        };
      } catch {
        return { layer, areaSqM: null, classes: [], message: "Could not measure this layer." };
      }
    }),
  );
}

/**
 * One self-contained run of rows: a heading and its list, or a theme with its
 * gradient bar, classes and note. A block is never split, which is what keeps
 * a theme's bar with the classes it explains.
 */
interface Block {
  height: number;
  draw: (c: Cursor) => void;
}

/** Everything the column has to say, in order, as blocks that can be flowed. */
function columnBlocks(input: ExportInput, measured: MeasuredRaster[]): ((c: Cursor) => void)[] {
  const blocks: ((c: Cursor) => void)[] = [];

  const vectors = input.layers.map((f) => ({
    label: f.properties.name,
    color: f.properties.color,
    kind: geometryKindOf(f.geometry.type),
  }));
  const nothingOn =
    vectors.length === 0 && input.overlays.length === 0 && input.rasterLegends.length === 0;

  // The heading travels with the first rows under it, so a column break can
  // never leave it stranded at the foot of a column.
  blocks.push((c) => {
    sectionHeading(c, "Legend");
    for (const v of vectors) swatchRow(c, v.color, v.kind, v.label);
    for (const o of input.overlays) swatchRow(c, o.color, o.geometryKind, o.label);
    if (nothingOn) emptyLine(c, "No layers switched on.");
    c.y += 6;
  });

  for (const raster of input.rasterLegends) {
    blocks.push((c) => {
      const legend = legendFor(raster.id, raster.imageKey);
      themeTitle(c, raster.name, raster.yearLabel);
      const scale = legend && rampScale(legend);
      if (scale) {
        gradientBar(
          c,
          scale.classes.map((cls) => cls.color),
          scale.low,
          scale.high,
          scale.ticks,
        );
      }
      for (const cls of legend?.classes ?? []) swatchRow(c, cls.color, "raster", cls.label);
      if (legend?.note) note(c, legend.note);
      if (!legend) emptyLine(c, "No class legend for this theme.");
      c.y += 6;
    });
  }

  const counts = countByLayer(input.layers);

  blocks.push((c) => {
    sectionHeading(c, "Statistics");
    keyValue(c, "Study area", `${COUNT.format(STUDY_AREA_HA)} ha`);
    if (measured.length === 0 && counts.length === 0) emptyLine(c, "Nothing measured.");
    c.y += 4;
  });

  for (const { layer, areaSqM, classes, message } of measured) {
    blocks.push((c) => {
      themeTitle(c, layer.name, layer.year != null ? String(layer.year) : undefined);
      if (message) emptyLine(c, message);
      else if (areaSqM != null) keyValue(c, "Mapped area", `${COUNT.format(areaSqM / 10_000)} ha`);
      for (const cls of classes) {
        swatchRow(
          c,
          cls.color,
          "raster",
          cls.label,
          `${COUNT.format(cls.areaSqM / 10_000)} ha · ${PERCENT.format(cls.share * 100)}%`,
          96,
        );
      }
      c.y += 6;
    });
  }

  if (counts.length > 0) {
    blocks.push((c) => {
      sectionHeading(c, "Features");
      for (const layer of counts) {
        swatchRow(c, layer.color, layer.geometryKind, layer.name, COUNT.format(layer.count), 40);
      }
      c.y += 6;
    });
  }

  return blocks;
}

/**
 * Measures each block by running its draw against a scratch context with
 * nothing switched on to draw with.
 *
 * Every row helper advances the cursor by a fixed amount and sets its font
 * before it measures anything, so the dry pass and the real pass agree to the
 * pixel — which they have to, because the page is sized from the dry pass.
 */
function measureBlocks(
  scratch: Ctx,
  font: string,
  width: number,
  draws: ((c: Cursor) => void)[],
): Block[] {
  return draws.map((draw) => {
    const c: Cursor = { ctx: scratch, x: 0, w: width, y: 0, dry: true, font };
    draw(c);
    return { height: c.y, draw };
  });
}

/**
 * Packs the blocks into columns no taller than `target`.
 *
 * Without this the sheet is as tall as its longest legend: Vegetation
 * Change alone is a 19-class transition matrix, which ran to nearly twice the
 * height of the map beside it and left the page almost square — so a
 * landscape PDF of it was mostly white margin. Flowed into two or three
 * columns the sheet stays wider than it is tall, which is the shape a map
 * sheet wants to be.
 *
 * A block taller than the target is not split; it simply overflows its
 * column and the page grows to fit, which is the honest outcome for a single
 * legend that really is that long.
 */
function flowColumns(blocks: Block[], target: number, maxColumns: number): Block[][] {
  const columns: Block[][] = [[]];
  let used = 0;
  for (const block of blocks) {
    const current = columns[columns.length - 1];
    const wouldOverflow = used + block.height > target;
    if (wouldOverflow && current.length > 0 && columns.length < maxColumns) {
      columns.push([block]);
      used = block.height;
    } else {
      current.push(block);
      used += block.height;
    }
  }
  return columns;
}

/** Builds the sheet and hands back the canvas it was drawn on. */
export async function renderDashboardSheet(input: ExportInput): Promise<HTMLCanvasElement> {
  // Geist is loaded through next/font; without this the first export can fall
  // back to a system face while the real one is still arriving.
  await document.fonts?.ready;
  const font =
    getComputedStyle(document.body).fontFamily || "system-ui, -apple-system, sans-serif";

  const measured = await measure(input.rasterStats);

  // The map's backing store is already at device resolution; drawing the
  // sheet at that same ratio puts the map in 1:1 and makes the text around it
  // just as crisp. Clamped because an unlaid-out canvas reports a client
  // width of 0, and dividing by it would ask for a canvas of several hundred
  // thousand pixels a side.
  const cssWidth = input.mapCanvas.clientWidth || 0;
  const ratio = cssWidth > 0 ? input.mapCanvas.width / cssWidth : window.devicePixelRatio || 1;
  const dpr = Math.min(3, Math.max(1, Math.round(ratio)));
  const mapW = input.mapCanvas.width / dpr;
  const mapH = input.mapCanvas.height / dpr;

  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) throw new Error("no 2d context");
  const inner = SIDEBAR - 2 * COL_INSET;
  const blocks = measureBlocks(scratch, font, inner, columnBlocks(input, measured));
  const columns = flowColumns(blocks, mapH - 2 * COL_INSET, MAX_COLUMNS);

  const columnH = Math.max(
    ...columns.map((col) => col.reduce((sum, b) => sum + b.height, 0) + 2 * COL_INSET),
  );
  const contentH = Math.max(mapH, columnH);
  const pageW =
    PAD + mapW + GAP + columns.length * SIDEBAR + (columns.length - 1) * COL_GAP + PAD;
  const pageH = PAD + HEADER_H + contentH + FOOTER_H + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(pageW * dpr);
  canvas.height = Math.round(pageH * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, pageW, pageH);

  // --- header --------------------------------------------------------------
  const basemap = basemapById(input.basemap);
  const stamp = new Date();
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `600 17px ${font}`;
  ctx.fillText("Shatrunjay Hills — Web GIS Dashboard", PAD, PAD + 16);
  ctx.fillStyle = MUTED;
  ctx.font = `400 10px ${font}`;
  ctx.fillText(
    [
      stamp.toLocaleString(),
      `${basemap.label} basemap`,
      `${input.centre.lat.toFixed(4)}, ${input.centre.lng.toFixed(4)}`,
      `zoom ${input.zoom.toFixed(1)}`,
    ].join("  ·  "),
    PAD,
    PAD + 33,
  );
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, PAD + HEADER_H - 10.5);
  ctx.lineTo(pageW - PAD, PAD + HEADER_H - 10.5);
  ctx.stroke();

  // --- the map, at its own pixel size -------------------------------------
  const bodyY = PAD + HEADER_H;
  ctx.drawImage(input.mapCanvas, PAD, bodyY, mapW, mapH);
  ctx.strokeStyle = RULE;
  ctx.strokeRect(PAD + 0.5, bodyY + 0.5, mapW - 1, mapH - 1);

  // --- the legend and statistics columns ----------------------------------
  columns.forEach((column, i) => {
    const x = PAD + mapW + GAP + i * (SIDEBAR + COL_GAP);
    ctx.fillStyle = PANEL;
    ctx.fillRect(x, bodyY, SIDEBAR, contentH);
    ctx.strokeStyle = RULE;
    ctx.strokeRect(x + 0.5, bodyY + 0.5, SIDEBAR - 1, contentH - 1);

    const c: Cursor = {
      ctx,
      x: x + COL_INSET,
      w: inner,
      y: bodyY + COL_INSET,
      dry: false,
      font,
    };
    for (const block of column) block.draw(c);
  });

  // --- footer: the tile attribution the map's own control carries ----------
  // The WebGL canvas has no attribution baked into it, so without this line
  // the export would drop a credit the tile terms require.
  ctx.textAlign = "left";
  ctx.fillStyle = FAINT;
  ctx.font = `400 9px ${font}`;
  ctx.fillText(basemap.attribution.replace(/<[^>]*>/g, ""), PAD, pageH - PAD - 2);

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("could not encode the sheet"))),
      "image/png",
    );
  });
}

/** Filename stamp: sortable, and distinct enough for repeated exports. */
function stampFor(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/**
 * Composes the sheet and downloads it as a PNG.
 *
 * The same sheet the PDF is made from, handed over as a file instead of to
 * the print dialog — for dropping into a slide or a chat, where a PDF is the
 * wrong shape.
 */
export async function downloadDashboardSheet(input: ExportInput): Promise<void> {
  const blob = await toBlob(await renderDashboardSheet(input));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shatrunjay-hills-${stampFor(new Date())}.png`;
  link.click();
  // Revoked on the next tick rather than immediately: Safari reads the href
  // after the click handler returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Longest edge of the printed page, in millimetres. A2's long edge. */
const PAGE_LONG_EDGE_MM = 420;

/**
 * The page is sized to the sheet, not the sheet to the page.
 *
 * A fixed A4 would waste whatever the sheet's aspect does not match, and the
 * sheet's aspect moves with how much legend there is — a map with one raster
 * on comes out wide, a map with Vegetation Change's transition matrix on
 * comes out nearly square. Deriving the page from the sheet gives a
 * borderless PDF either way, which is what "the page as seen" means. Anyone
 * who wants A4 can pick it in the dialog, and `contain` keeps the sheet true
 * when they do.
 */
function printDocument(src: string, title: string, aspect: number): string {
  const long = PAGE_LONG_EDGE_MM;
  const [w, h] = aspect >= 1 ? [long, long / aspect] : [long * aspect, long];
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: ${w.toFixed(1)}mm ${h.toFixed(1)}mm; margin: 0; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; }
      body { display: flex; align-items: center; justify-content: center; }
      img { width: 100%; height: 100%; object-fit: contain; }
    </style>
  </head>
  <body><img src="${src}" alt="${title}" /></body>
</html>`;
}

/**
 * Composes the sheet and opens the print dialog on it, where "Save as PDF" is
 * the destination.
 *
 * Printed from a detached iframe rather than the app's own window: the
 * dashboard's styles, its fixed-height shell and its two floating panels all
 * stay out of it, and there is no popup to be blocked. The frame is only
 * removed once the dialog has closed — tearing it down earlier cancels the
 * print in Chrome.
 */
export async function printDashboardSheet(input: ExportInput): Promise<void> {
  const canvas = await renderDashboardSheet(input);
  const blob = await toBlob(canvas);
  // A blob URL rather than a data URL: the sheet runs to several megabytes,
  // and base64 would carry a third more of it through two documents.
  const src = URL.createObjectURL(blob);

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Dashboard export";
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const cleanup = () => {
    URL.revokeObjectURL(src);
    frame.remove();
  };

  try {
    const doc = frame.contentDocument;
    const view = frame.contentWindow;
    if (!doc || !view) throw new Error("could not open the print document");

    doc.open();
    doc.write(
      printDocument(
        src,
        "Shatrunjay Hills — Web GIS Dashboard",
        canvas.width / canvas.height,
      ),
    );
    doc.close();

    // Print before the image has decoded and the page comes out blank.
    const image = doc.images[0];
    if (image && !image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }

    view.addEventListener("afterprint", cleanup, { once: true });
    // Not every browser fires afterprint; this is the backstop, long enough
    // that it cannot land while someone is still choosing a destination.
    setTimeout(cleanup, 120_000);

    view.focus();
    view.print();
  } catch (err) {
    cleanup();
    throw err;
  }
}
