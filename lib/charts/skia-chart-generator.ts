/**
 * Skia-based Chart Generator
 *
 * Generates sleep report images programmatically using react-native-skia.
 * This works in background without needing React UI components.
 */

import { Skia, SkCanvas, SkColor, SkFont } from '@shopify/react-native-skia';
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { SleepDay, HeartRatePoint } from '../types';
import { formatDuration, formatTime } from '../processing/statistics';
import { formatDateForDisplay } from '../storage/history';
import { colors } from '@/constants/colors';
import { getSleepPhaseColor } from '@/constants/sleep-phases';

// Scale factor for higher resolution (3x for sharp retina)
const SCALE = 3;

// Base dimensions (before scaling)
const BASE_WIDTH = 350;
const BASE_PADDING = 24;
const BASE_CHART_HEIGHT = 180; // Compact chart height

// Scaled dimensions
const WIDTH = BASE_WIDTH * SCALE;
const PADDING = BASE_PADDING * SCALE;
const CHART_HEIGHT = BASE_CHART_HEIGHT * SCALE;

// Scale helper
const s = (v: number) => v * SCALE;

// Font cache
let fontMgr: ReturnType<typeof Skia.FontMgr.System> | null = null;
let typeface: ReturnType<ReturnType<typeof Skia.FontMgr.System>['matchFamilyStyle']> | null = null;
let typefaceBold: ReturnType<ReturnType<typeof Skia.FontMgr.System>['matchFamilyStyle']> | null = null;

const getTypeface = (bold = false) => {
  if (!fontMgr) {
    fontMgr = Skia.FontMgr.System();
  }
  if (bold) {
    if (!typefaceBold) {
      typefaceBold = fontMgr.matchFamilyStyle('Helvetica Neue', { weight: 600, width: 5, slant: 0 });
    }
    return typefaceBold;
  }
  if (!typeface) {
    typeface = fontMgr.matchFamilyStyle('Helvetica Neue', { weight: 400, width: 5, slant: 0 });
  }
  return typeface;
};

const createFont = (baseSize: number, bold = false): SkFont => {
  const tf = getTypeface(bold);
  return Skia.Font(tf, baseSize * SCALE);
};

// Colors
const skiaColor = (hex: string): SkColor => Skia.Color(hex);
const COLORS = {
  bg: skiaColor(colors.surface),
  text: skiaColor(colors.textPrimary),
  textSecondary: skiaColor(colors.textSecondary),
  primary: skiaColor(colors.primary),
  grid: skiaColor(colors.background), // White grid lines like original
  white: skiaColor('#FFFFFF'),
};

// Measure text width for centering
const measureText = (text: string, font: SkFont): number => {
  return font.measureText(text).width;
};

/**
 * Generate chart image for a sleep day
 */
export async function generateChartImage(sleepDay: SleepDay): Promise<string | null> {
  try {
    if (!sleepDay.hasData || !sleepDay.data) {
      return null;
    }

    const { stats, points, duration, sleepStart, sleepEnd } = sleepDay.data;

    // Layout calculations
    const headerTop = s(38);
    const dateTop = s(58);
    const chartTop = s(82);
    const chartBottom = chartTop + CHART_HEIGHT;
    const xAxisLabelsTop = chartBottom + s(16);
    const legendTop = chartBottom + s(40);
    const statsLabelTop = chartBottom + s(78);   // More gap above stats
    const statsValueTop = chartBottom + s(101);
    const footerTop = chartBottom + s(122);      // Less gap below stats
    const totalHeight = chartBottom + s(162);

    // Create surface
    const surface = Skia.Surface.MakeOffscreen(WIDTH, totalHeight);
    if (!surface) {
      return null;
    }

    const canvas = surface.getCanvas();

    // Background
    const bgPaint = Skia.Paint();
    bgPaint.setColor(COLORS.bg);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(0, 0, WIDTH, totalHeight), s(16), s(16)),
      bgPaint
    );

    // Header
    drawHeader(canvas, sleepDay.date, headerTop, dateTop);

    // Chart
    drawChart(canvas, points, stats, sleepStart, sleepEnd, chartTop, chartBottom, xAxisLabelsTop);

    // Legend
    drawLegend(canvas, legendTop);

    // Stats
    drawStats(canvas, stats, duration, statsLabelTop, statsValueTop);

    // Footer
    drawFooter(canvas, footerTop);

    // Export
    const image = surface.makeImageSnapshot();
    if (!image) {
      return null;
    }

    const imageData = image.encodeToBase64();
    if (!imageData) {
      return null;
    }

    const fileName = `sleep_chart_${sleepDay.date}_${Date.now()}.png`;
    const filePath = `${cacheDirectory}${fileName}`;
    await writeAsStringAsync(filePath, imageData, { encoding: EncodingType.Base64 });

    return filePath;
  } catch (error) {
    console.error('[SkiaChart] Generation error:', error);
    return null;
  }
}

function drawHeader(canvas: SkCanvas, date: string, titleY: number, dateY: number) {
  const titleFont = createFont(18, true);
  const dateFont = createFont(14);

  const titlePaint = Skia.Paint();
  titlePaint.setColor(COLORS.text);
  canvas.drawText('Sleep Heart Rate Report', PADDING, titleY, titlePaint, titleFont);

  const datePaint = Skia.Paint();
  datePaint.setColor(COLORS.textSecondary);
  canvas.drawText(formatDateForDisplay(date), PADDING, dateY, datePaint, dateFont);
}

function drawChart(
  canvas: SkCanvas,
  points: HeartRatePoint[],
  stats: { average: number; min: number; max: number; minTime: string; maxTime: string },
  sleepStart: string,
  sleepEnd: string,
  top: number,
  bottom: number,
  xAxisY: number
) {
  // Chart area - start more to the left
  const chartLeft = PADDING + s(16);
  const chartRight = WIDTH - PADDING - s(32);
  const chartWidth = chartRight - chartLeft;

  // Filter points
  const startTime = new Date(sleepStart).getTime();
  const endTime = new Date(sleepEnd).getTime();
  const filtered = points.filter((p) => {
    const t = new Date(p.time).getTime();
    return t >= startTime && t <= endTime;
  });
  if (filtered.length === 0) return;

  const hrValues = filtered.map((p) => p.hr);
  const minHr = Math.min(...hrValues);
  const maxHr = Math.max(...hrValues);
  const range = maxHr - minHr || 1;

  // Grid lines - extend to right edge of AVG badge area
  const gridRight = chartRight + s(30);
  const gridPaint = Skia.Paint();
  gridPaint.setColor(COLORS.grid);
  gridPaint.setStrokeWidth(s(1));
  canvas.drawLine(chartLeft, top, gridRight, top, gridPaint);
  canvas.drawLine(chartLeft, top + (bottom - top) / 2, gridRight, top + (bottom - top) / 2, gridPaint);
  canvas.drawLine(chartLeft, bottom, gridRight, bottom, gridPaint);

  // Y-axis labels - positioned at right edge of y-axis area
  const yLabelFont = createFont(10);
  const yLabelPaint = Skia.Paint();
  yLabelPaint.setColor(COLORS.textSecondary);
  // Original yAxis: width: CHART_PADDING_LEFT - 2, alignItems: 'flex-end'
  // Position labels right-aligned within the y-axis area
  const yAxisRight = chartLeft - s(2);
  const maxHrText = String(maxHr);
  const midHrText = String(Math.round((maxHr + minHr) / 2));
  const minHrText = String(minHr);
  canvas.drawText(maxHrText, yAxisRight - measureText(maxHrText, yLabelFont), top + s(4), yLabelPaint, yLabelFont);
  canvas.drawText(midHrText, yAxisRight - measureText(midHrText, yLabelFont), top + (bottom - top) / 2 + s(4), yLabelPaint, yLabelFont);
  canvas.drawText(minHrText, yAxisRight - measureText(minHrText, yLabelFont), bottom + s(4), yLabelPaint, yLabelFont);

  // X-axis labels
  const xLabelFont = createFont(10);
  canvas.drawText(formatTime(sleepStart), chartLeft, xAxisY, yLabelPaint, xLabelFont);
  const endText = formatTime(sleepEnd);
  // Position end time at X coordinate of last data point
  canvas.drawText(endText, chartRight, xAxisY, yLabelPaint, xLabelFont);

  // Average line (dashed) - mimics original flex layout with gap: 6
  // Original creates dashes via flexbox with 20 segments and gap: 6
  const avgY = bottom - ((stats.average - minHr) / range) * (bottom - top);
  const avgPaint = Skia.Paint();
  avgPaint.setColor(COLORS.primary);
  avgPaint.setAlphaf(0.5); // Original has opacity: 0.5
  avgPaint.setStrokeWidth(s(1));
  // dash length ~= (chartWidth - 19*gap) / 20, gap = 6
  // approx: dash 10, gap 6
  avgPaint.setPathEffect(Skia.PathEffect.MakeDash([s(10), s(6)], 0));
  canvas.drawLine(chartLeft, avgY, chartRight, avgY, avgPaint);

  // Data points
  const totalPts = filtered.length;
  const maxPts = 120;
  const step = Math.max(1, Math.floor(totalPts / maxPts));

  for (let i = 0; i < totalPts; i += step) {
    const pt = filtered[i];
    const x = chartLeft + (i / (totalPts - 1)) * chartWidth;
    const y = bottom - ((pt.hr - minHr) / range) * (bottom - top);
    const ptPaint = Skia.Paint();

    if (pt.isOutlier) {
      ptPaint.setColor(COLORS.textSecondary);
      ptPaint.setAlphaf(0.4);
      canvas.drawCircle(x, y, s(2), ptPaint);
    } else {
      ptPaint.setColor(skiaColor(getSleepPhaseColor(pt.phase)));
      canvas.drawCircle(x, y, s(3), ptPaint);
    }
  }

  // Markers - square badges 28x28
  const markerW = s(28);
  const markerH = s(28);

  // AVG marker (always on right side of chart, after where points end)
  drawMarker(canvas, chartRight + s(2), avgY - markerH / 2, 'AVG', String(stats.average));

  // MAX marker - positioned above the max point
  const maxIdx = filtered.findIndex((p) => p.time === stats.maxTime);
  if (maxIdx >= 0) {
    const maxX = chartLeft + (maxIdx / (totalPts - 1)) * chartWidth;
    const maxY = bottom - ((stats.max - minHr) / range) * (bottom - top);
    const markerX = Math.max(chartLeft, Math.min(chartRight - markerW + s(10), maxX - markerW / 2));
    const markerY = Math.max(maxY - markerH - s(4), top);
    drawMarker(canvas, markerX, markerY, 'MAX', String(stats.max));
  }

  // MIN marker - positioned below the min point
  const minIdx = filtered.findIndex((p) => p.time === stats.minTime);
  if (minIdx >= 0) {
    const minX = chartLeft + (minIdx / (totalPts - 1)) * chartWidth;
    const minY = bottom - ((stats.min - minHr) / range) * (bottom - top);
    const markerX = Math.max(chartLeft, Math.min(chartRight - markerW + s(10), minX - markerW / 2));
    const markerY = Math.min(minY + s(4), bottom - markerH);
    drawMarker(canvas, markerX, markerY, 'MIN', String(stats.min));
  }
}

function drawMarker(canvas: SkCanvas, x: number, y: number, label: string, value: string) {
  const bgPaint = Skia.Paint();
  bgPaint.setColor(skiaColor('rgba(59, 130, 246, 0.75)'));

  const borderPaint = Skia.Paint();
  borderPaint.setColor(COLORS.primary);
  borderPaint.setStyle(1); // Stroke
  borderPaint.setStrokeWidth(s(1));

  // Square badge: 28x28
  const w = s(28);
  const h = s(28);
  const borderRadius = s(4);
  const rect = Skia.RRectXY(Skia.XYWHRect(x, y, w, h), borderRadius, borderRadius);
  canvas.drawRRect(rect, bgPaint);
  canvas.drawRRect(rect, borderPaint);

  // Original fonts: label 8px, value 12px
  const labelFont = createFont(8);
  const valueFont = createFont(12, true);

  const labelPaint = Skia.Paint();
  labelPaint.setColor(COLORS.white);
  labelPaint.setAlphaf(0.8);

  const valuePaint = Skia.Paint();
  valuePaint.setColor(COLORS.white);

  const labelWidth = measureText(label, labelFont);
  const valueWidth = measureText(value, valueFont);

  canvas.drawText(label, x + (w - labelWidth) / 2, y + s(10), labelPaint, labelFont);
  canvas.drawText(value, x + (w - valueWidth) / 2, y + s(22), valuePaint, valueFont);
}

function drawLegend(canvas: SkCanvas, top: number) {
  // Match original: gap: 16 between items, gap: 6 between dot and label
  // legendDot: width: 10, height: 10, borderRadius: 5
  // legendLabel: fontSize: 12
  const items = [
    { color: colors.phaseRem, label: 'REM' },
    { color: colors.phaseCore, label: 'Core' },
    { color: colors.phaseDeep, label: 'Deep' },
    { color: colors.textSecondary, label: 'Outlier' },
  ];

  const font = createFont(12);
  const paint = Skia.Paint();
  paint.setColor(COLORS.textSecondary);

  const dotRadius = s(5); // 10x10 dot = radius 5
  const dotToTextGap = s(6);
  const itemGap = s(16);

  // Calculate total width to center the legend
  let totalWidth = 0;
  const itemWidths: number[] = [];
  for (const item of items) {
    const labelWidth = measureText(item.label, font);
    const itemWidth = dotRadius * 2 + dotToTextGap + labelWidth;
    itemWidths.push(itemWidth);
    totalWidth += itemWidth;
  }
  totalWidth += itemGap * (items.length - 1);

  let x = (WIDTH - totalWidth) / 2 + dotRadius;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dotPaint = Skia.Paint();
    dotPaint.setColor(skiaColor(item.color));
    canvas.drawCircle(x, top, dotRadius, dotPaint);
    canvas.drawText(item.label, x + dotRadius + dotToTextGap, top + s(4), paint, font);
    x += itemWidths[i] + itemGap;
  }
}

function drawStats(
  canvas: SkCanvas,
  stats: { average: number; min: number; max: number },
  duration: number,
  labelY: number,
  valueY: number
) {
  const items = [
    { label: 'Average', value: String(stats.average), unit: 'bpm' },
    { label: 'Min', value: String(stats.min), unit: 'bpm' },
    { label: 'Max', value: String(stats.max), unit: 'bpm' },
    { label: 'Duration', value: formatDuration(duration), unit: '' },
  ];

  const labelFont = createFont(11);
  const valueFont = createFont(18, true);
  const unitFont = createFont(10);

  const labelPaint = Skia.Paint();
  labelPaint.setColor(COLORS.textSecondary);

  const valuePaint = Skia.Paint();
  valuePaint.setColor(COLORS.text);

  // Stats area matches footer line width exactly (PADDING to WIDTH-PADDING)
  // First item's left edge at PADDING, last item's right edge at WIDTH-PADDING
  const valueFont18 = valueFont;

  // Calculate total width of each item (value + unit)
  const itemWidths = items.map((item) => {
    const vw = measureText(item.value, valueFont18);
    const uw = item.unit ? measureText(item.unit, unitFont) : 0;
    const g = item.unit ? s(3) : 0;
    return vw + g + uw;
  });

  // Available width for spacing between items
  const totalItemWidth = itemWidths.reduce((a, b) => a + b, 0);
  const availableWidth = (WIDTH - PADDING * 2) - totalItemWidth;
  const gapBetweenItems = availableWidth / (items.length - 1);

  let currentX = PADDING;

  items.forEach((item, i) => {
    const itemWidth = itemWidths[i];
    const centerX = currentX + itemWidth / 2;

    // Label (centered above value)
    const labelWidth = measureText(item.label, labelFont);
    canvas.drawText(item.label, centerX - labelWidth / 2, labelY, labelPaint, labelFont);

    // Value + unit (left-aligned at currentX)
    const valueWidth = measureText(item.value, valueFont);
    const gap = item.unit ? s(3) : 0;

    canvas.drawText(item.value, currentX, valueY, valuePaint, valueFont);
    if (item.unit) {
      canvas.drawText(item.unit, currentX + valueWidth + gap, valueY, labelPaint, unitFont);
    }

    // Move to next item position
    currentX += itemWidth + gapBetweenItems;
  });
}

function drawFooter(canvas: SkCanvas, top: number) {
  // Divider
  const linePaint = Skia.Paint();
  linePaint.setColor(COLORS.grid);
  linePaint.setStrokeWidth(s(1));
  canvas.drawLine(PADDING, top, WIDTH - PADDING, top, linePaint);

  // Text (centered)
  const font = createFont(12);
  const paint = Skia.Paint();
  paint.setColor(COLORS.textSecondary);

  const text = 'Night Pulse';
  const textWidth = measureText(text, font);
  canvas.drawText(text, (WIDTH - textWidth) / 2, top + s(22), paint, font);
}
