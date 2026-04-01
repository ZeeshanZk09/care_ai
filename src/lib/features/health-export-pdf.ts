import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from 'pdf-lib';

type FeatureResultRow = {
  featureKey: string;
  createdAt: Date;
  result: unknown;
};

const PAGE_MARGIN = 48;
const LINE_HEIGHT = 16;
const BODY_SIZE = 11;

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const toPrintableJson = (value: unknown) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
};

const splitLinesToWidth = (params: {
  text: string;
  font: PDFFont;
  size: number;
  maxWidth: number;
}) => {
  const lines: string[] = [];
  const rawLines = params.text.split(/\r?\n/);

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      lines.push('');
      continue;
    }

    let current = '';
    const words = rawLine.split(' ');

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = params.font.widthOfTextAtSize(candidate, params.size);

      if (width <= params.maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
};

const drawWrappedBlock = (params: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  startY: number;
  maxWidth: number;
  size: number;
  lineHeight: number;
  color?: ReturnType<typeof rgb>;
}) => {
  const lines = splitLinesToWidth({
    text: params.text,
    font: params.font,
    size: params.size,
    maxWidth: params.maxWidth,
  });

  let y = params.startY;
  for (const line of lines) {
    params.page.drawText(line, {
      x: params.x,
      y,
      size: params.size,
      font: params.font,
      color: params.color ?? rgb(0.12, 0.12, 0.12),
    });
    y -= params.lineHeight;
  }

  return y;
};

export const generateHealthTimelinePdf = async (params: {
  userLabel: string;
  rows: FeatureResultRow[];
}) => {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const createPage = () => {
    return pdfDoc.addPage([595, 842]);
  };

  const drawFooter = (page: PDFPage) => {
    page.drawLine({
      start: { x: PAGE_MARGIN, y: 56 },
      end: { x: page.getWidth() - PAGE_MARGIN, y: 56 },
      thickness: 0.7,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText(
      'DISCLAIMER: This AI-generated document is for informational use only and does not replace licensed medical advice.',
      {
        x: PAGE_MARGIN,
        y: 40,
        size: 8,
        font: bodyFont,
        color: rgb(0.38, 0.38, 0.38),
      }
    );
  };

  const cover = createPage();
  cover.drawText('CareAI Health Timeline Export', {
    x: PAGE_MARGIN,
    y: 760,
    size: 24,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  cover.drawText(`Generated for: ${params.userLabel}`, {
    x: PAGE_MARGIN,
    y: 726,
    size: 13,
    font: bodyFont,
    color: rgb(0.15, 0.15, 0.15),
  });

  cover.drawText(`Generated at: ${formatDateTime(new Date())}`, {
    x: PAGE_MARGIN,
    y: 706,
    size: 11,
    font: bodyFont,
    color: rgb(0.22, 0.22, 0.22),
  });

  cover.drawText(`Total feature entries: ${params.rows.length}`, {
    x: PAGE_MARGIN,
    y: 686,
    size: 11,
    font: bodyFont,
    color: rgb(0.22, 0.22, 0.22),
  });

  drawFooter(cover);

  for (const row of params.rows) {
    let page = createPage();
    let cursorY = 770;

    page.drawText(`Feature: ${row.featureKey}`, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: 17,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    cursorY -= 26;

    page.drawText(`Used: ${formatDateTime(row.createdAt)}`, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: 10,
      font: bodyFont,
      color: rgb(0.28, 0.28, 0.28),
    });

    cursorY -= 24;

    const printable = toPrintableJson(row.result);
    const lines = splitLinesToWidth({
      text: printable,
      font: bodyFont,
      size: BODY_SIZE,
      maxWidth: page.getWidth() - PAGE_MARGIN * 2,
    });

    for (const line of lines) {
      if (cursorY <= 74) {
        drawFooter(page);
        page = createPage();
        cursorY = 770;
      }

      page.drawText(line, {
        x: PAGE_MARGIN,
        y: cursorY,
        size: BODY_SIZE,
        font: bodyFont,
        color: rgb(0.12, 0.12, 0.12),
      });

      cursorY -= LINE_HEIGHT;
    }

    if (cursorY > 90) {
      cursorY -= 8;
      drawWrappedBlock({
        page,
        font: bodyFont,
        text: 'End of feature section.',
        x: PAGE_MARGIN,
        startY: cursorY,
        maxWidth: page.getWidth() - PAGE_MARGIN * 2,
        size: 9,
        lineHeight: 12,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    drawFooter(page);
  }

  return pdfDoc.save();
};
