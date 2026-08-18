import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require('docx');
const sharp = require('sharp');

const inputPath = path.resolve(
  process.argv[2] ?? 'docs/handbook/苏南船舶管理系统操作手册.md',
);
const outputPath = path.resolve(
  process.argv[3] ?? 'docs/handbook/苏南船舶管理系统操作手册.docx',
);
const inputDir = path.dirname(inputPath);

const A4_WIDTH = 11_906;
const A4_HEIGHT = 16_838;
const MARGIN_TOP = 1_020;
const MARGIN_RIGHT = 1_191;
const MARGIN_BOTTOM = 964;
const MARGIN_LEFT = 1_191;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const BODY_FONT = {
  ascii: 'Arial',
  eastAsia: 'SimSun',
  hAnsi: 'Arial',
  cs: 'Arial',
};
const HEADING_FONT = {
  ascii: 'Arial',
  eastAsia: 'Microsoft YaHei',
  hAnsi: 'Arial',
  cs: 'Arial',
};

const border = { style: BorderStyle.SINGLE, size: 4, color: 'B7C4D3' };
const tableBorders = {
  top: border,
  bottom: border,
  left: border,
  right: border,
  insideHorizontal: border,
  insideVertical: border,
};
const imageCache = new Map();
const numberingConfigs = [];
let listSequence = 0;
let renderedImageCount = 0;
let topLevelHeadingCount = 0;

// Current pagination after rendering the fixed-size 4:3 placeholders and real screenshots on A4.
// Recheck these hints after changing body copy or image dimensions.
const CHAPTER_PAGE_HINTS = [3, 6, 8, 19, 32, 48, 56, 82, 94, 96, 98, 102, 103, 104];

function stripFrontMatter(markdown) {
  if (!markdown.startsWith('---\n')) return markdown;
  const closing = markdown.indexOf('\n---\n', 4);
  return closing === -1 ? markdown : markdown.slice(closing + 5);
}

function extractMetadata(markdown) {
  const version = markdown.match(/\| 系统版本 \| ([^|]+) \|/)?.[1]?.trim() ?? '-';
  const reviewedAt = markdown.match(/\| 核对日期 \| ([^|]+) \|/)?.[1]?.trim() ?? '-';
  const container = markdown.match(/\| 主要运行容器 \| ([^|]+) \|/)?.[1]?.trim() ?? '企业微信 H5';
  return { version, reviewedAt, container };
}

function extractTopLevelHeadings(markdown) {
  return stripFrontMatter(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(/^##\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .map((title, index) => ({
      title: markdownPlainText(title),
      page: CHAPTER_PAGE_HINTS[index] ?? '—',
    }));
}

function markdownPlainText(value) {
  return value
    .replace(/<br\s*\/?>/gi, '；')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\\|/g, '|')
    .trim();
}

function inlineChildren(value, options = {}) {
  const children = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match;

  const pushRun = (text, extra = {}) => {
    if (!text) return;
    children.push(
      new TextRun({
        text,
        font: options.font ?? BODY_FONT,
        size: options.size ?? 21,
        color: options.color ?? '1F2937',
        bold: options.bold ?? false,
        ...extra,
      }),
    );
  };

  while ((match = pattern.exec(value)) !== null) {
    pushRun(value.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      pushRun(token.slice(2, -2), { bold: true });
    } else if (token.startsWith('`')) {
      pushRun(token.slice(1, -1), {
        font: { ascii: 'Menlo', eastAsia: 'Microsoft YaHei', hAnsi: 'Menlo' },
        color: '34495E',
        shading: { fill: 'EEF2F6', type: ShadingType.CLEAR },
      });
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link?.[2].startsWith('http')) {
        children.push(
          new ExternalHyperlink({
            link: link[2],
            children: [
              new TextRun({
                text: link[1],
                font: BODY_FONT,
                size: options.size ?? 21,
                color: '2F75B5',
                underline: {},
              }),
            ],
          }),
        );
      } else {
        pushRun(link?.[1] ?? token, { color: '2F75B5', underline: {} });
      }
    }
    cursor = match.index + token.length;
  }
  pushRun(value.slice(cursor));
  return children.length ? children : [new TextRun({ text: '', font: BODY_FONT })];
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => markdownPlainText(cell));
}

function tableColumnWidths(rows) {
  const columnCount = Math.max(...rows.map((row) => row.length));
  const weights = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxLength = Math.max(
      ...rows.map((row) => Array.from(row[columnIndex] ?? '').length),
      4,
    );
    return Math.min(Math.max(maxLength, 6), 30);
  });
  const minWidth = Math.min(1_100, Math.floor(CONTENT_WIDTH / columnCount));
  const remaining = CONTENT_WIDTH - minWidth * columnCount;
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const widths = weights.map(
    (weight) => minWidth + Math.floor((remaining * weight) / weightTotal),
  );
  widths[widths.length - 1] += CONTENT_WIDTH - widths.reduce((sum, value) => sum + value, 0);
  return widths;
}

function createTable(rows, { header = true, widths = null } = {}) {
  const normalizedRows = rows.map((row) => [...row]);
  const columnCount = Math.max(...normalizedRows.map((row) => row.length));
  normalizedRows.forEach((row) => {
    while (row.length < columnCount) row.push('');
  });
  const columnWidths = widths ?? tableColumnWidths(normalizedRows);

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    borders: tableBorders,
    rows: normalizedRows.map(
      (row, rowIndex) =>
        new TableRow({
          cantSplit: true,
          tableHeader: header && rowIndex === 0,
          children: row.map(
            (cell, columnIndex) =>
              new TableCell({
                width: { size: columnWidths[columnIndex], type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                shading:
                  header && rowIndex === 0
                    ? { fill: 'DDEBF7', type: ShadingType.CLEAR }
                    : undefined,
                margins: { top: 90, bottom: 90, left: 110, right: 110 },
                children: [
                  new Paragraph({
                    alignment:
                      columnIndex === 0 && /^\d+$/.test(cell)
                        ? AlignmentType.CENTER
                        : AlignmentType.LEFT,
                    spacing: { before: 0, after: 0, line: 280 },
                    children: inlineChildren(cell, {
                      size: 18,
                      bold: header && rowIndex === 0,
                      color: '1F2937',
                    }),
                  }),
                ],
              }),
          ),
        }),
    ),
  });
}

async function imageParts(relativePath) {
  const absolutePath = path.resolve(inputDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Markdown 图片不存在：${relativePath}`);
  }
  if (!imageCache.has(absolutePath)) {
    imageCache.set(absolutePath, (async () => {
      const source = sharp(absolutePath);
      const metadata = await source.metadata();
      const isPlaceholder = relativePath.endsWith('.svg') || relativePath.includes('screenshot-placeholder');

      if (isPlaceholder) {
        const data = await source
          .resize(1_200, 900, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .png()
          .toBuffer();
        return [{ data, width: 600, height: 450 }];
      }

      const sourceWidth = metadata.width ?? 1_200;
      const renderWidth = Math.min(sourceWidth, 1_200);
      const resized = await source
        .resize({ width: renderWidth, withoutEnlargement: true })
        .png()
        .toBuffer();
      const resizedMetadata = await sharp(resized).metadata();
      const resizedWidth = resizedMetadata.width ?? renderWidth;
      const resizedHeight = resizedMetadata.height ?? 900;
      const chunkHeight = 1_440;
      const parts = [];

      // Word cannot split a single drawing across pages, so long screenshots are split into contiguous page-sized slices.
      for (let top = 0; top < resizedHeight; top += chunkHeight) {
        const height = Math.min(chunkHeight, resizedHeight - top);
        const data = await sharp(resized)
          .extract({ left: 0, top, width: resizedWidth, height })
          .png()
          .toBuffer();
        parts.push({
          data,
          width: 600,
          height: Math.max(1, Math.round((600 * height) / resizedWidth)),
        });
      }
      return parts;
    })());
  }
  return imageCache.get(absolutePath);
}

async function imageParagraph(altText, relativePath) {
  const parts = await imageParts(relativePath);
  renderedImageCount += 1;
  return parts.map((part, index) => new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: index === parts.length - 1,
    spacing: { before: index === 0 ? 160 : 0, after: 80 },
    children: [
      new ImageRun({
        type: 'png',
        data: part.data,
        transformation: { width: part.width, height: part.height },
        altText: {
          title: altText || '系统截图',
          description: altText || '系统截图',
          name: altText || 'System screenshot',
        },
      }),
    ],
  }));
}

function headingParagraph(level, text) {
  const headingLevel =
    level === 2
      ? HeadingLevel.HEADING_1
      : level === 3
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3;
  if (level === 2) topLevelHeadingCount += 1;
  return new Paragraph({
    heading: headingLevel,
    pageBreakBefore: level === 2 && topLevelHeadingCount > 1,
    keepNext: true,
    children: inlineChildren(text, {
      font: HEADING_FONT,
      size: level === 2 ? 32 : level === 3 ? 28 : 24,
      bold: true,
      color: level === 2 ? '17365D' : '1F2937',
    }),
  });
}

function listParagraphs(items, ordered) {
  listSequence += 1;
  const reference = `${ordered ? 'numbers' : 'bullets'}-${listSequence}`;
  numberingConfigs.push({
    reference,
    levels: [
      {
        level: 0,
        format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
        text: ordered ? '%1.' : '•',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 600, hanging: 300 } },
        },
      },
    ],
  });
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference, level: 0 },
        spacing: { before: 20, after: 70, line: 340 },
        children: inlineChildren(item),
      }),
  );
}

async function parseMarkdown(markdown) {
  const lines = stripFrontMatter(markdown).split(/\r?\n/);
  const children = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      children.push(...(await imageParagraph(image[1], image[2])));
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (level > 1) children.push(headingParagraph(level, heading[2]));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      const rows = tableLines
        .filter((tableLine) => !isTableSeparator(tableLine))
        .map(splitTableRow);
      if (rows.length) children.push(createTable(rows));
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (ordered || bullet) {
      const orderedList = Boolean(ordered);
      const items = [];
      const matcher = orderedList ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].trim().match(matcher);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      children.push(...listParagraphs(items, orderedList));
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      children.push(
        new Paragraph({
          border: {
            left: { style: BorderStyle.SINGLE, size: 14, color: '5B9BD5', space: 10 },
          },
          shading: { fill: 'F3F7FB', type: ShadingType.CLEAR },
          indent: { left: 240, right: 120 },
          spacing: { before: 80, after: 100, line: 340 },
          children: inlineChildren(quoteLines.join(' ')),
        }),
      );
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (
        !next ||
        /^#{1,4}\s+/.test(next) ||
        /^!\[/.test(next) ||
        next.startsWith('|') ||
        /^\d+\.\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        next.startsWith('>')
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }
    const paragraphText = paragraphLines.join(' ');
    const isCaption = /^\*图\s/.test(paragraphText) && paragraphText.endsWith('*');
    children.push(
      new Paragraph({
        alignment: isCaption ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        keepLines: isCaption,
        spacing: isCaption
          ? { before: 0, after: 160, line: 300 }
          : { before: 0, after: 110, line: 360 },
        children: isCaption
          ? [
              new TextRun({
                text: markdownPlainText(paragraphText.slice(1, -1)),
                font: BODY_FONT,
                size: 18,
                color: '4B5563',
                italics: true,
              }),
            ]
          : inlineChildren(paragraphText),
      }),
    );
  }

  return children;
}

function coverBar(text) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill: '111827', type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 240, bottom: 240, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text,
                    font: HEADING_FONT,
                    size: 30,
                    bold: true,
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function tableWithoutBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };
}

function staticTableOfContents(entries) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH - 1_000, 1_000],
    borders: tableWithoutBorders(),
    rows: entries.map(
      (entry) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: CONTENT_WIDTH - 1_000, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 0, right: 100 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 280 },
                  children: [
                    new TextRun({
                      text: entry.title,
                      font: BODY_FONT,
                      size: 21,
                      color: '2F75B5',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 1_000, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 0, after: 0, line: 280 },
                  children: [
                    new TextRun({
                      text: String(entry.page),
                      font: BODY_FONT,
                      size: 21,
                      color: '4B5563',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

function coverChildren(metadata, tocEntries) {
  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 1_400 },
      children: [
        new TextRun({
          text: `苏南船舶管理系统 ${metadata.version}｜应用软件说明书`,
          font: BODY_FONT,
          size: 18,
          color: '4B5563',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'SUNAN',
          font: HEADING_FONT,
          size: 34,
          bold: true,
          color: '2F75B5',
          characterSpacing: 90,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 360 },
      children: [
        new TextRun({
          text: '苏南船舶管理系统',
          font: HEADING_FONT,
          size: 42,
          bold: true,
          color: '111827',
        }),
      ],
    }),
    coverBar('应用软件说明书（用户操作手册）'),
    new Paragraph({ spacing: { before: 460, after: 0 }, children: [] }),
    createTable(
      [
        ['软件版本', metadata.version],
        ['运行容器', metadata.container],
        ['适用对象', '企业微信 H5 用户、业务经办人、审批人及系统管理员'],
        ['核对日期', metadata.reviewedAt],
      ],
      { header: false, widths: [2_700, CONTENT_WIDTH - 2_700] },
    ),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({ text: '目录', font: HEADING_FONT, size: 32, bold: true, color: '17365D' }),
      ],
    }),
    staticTableOfContents(tocEntries),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

const markdown = fs.readFileSync(inputPath, 'utf8');
const metadata = extractMetadata(markdown);
const tocEntries = extractTopLevelHeadings(markdown);
const contentChildren = await parseMarkdown(markdown);

const document = new Document({
  title: '苏南船舶管理系统操作手册',
  subject: '苏南船舶管理系统应用软件说明书与用户操作手册',
  creator: '苏南船舶管理系统项目组',
  description: '基于当前生产版本生成的用户操作手册。',
  features: { updateFields: true },
  styles: {
    default: {
      document: {
        run: { font: BODY_FONT, size: 21, color: '1F2937' },
        paragraph: { spacing: { line: 360, after: 110 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { font: HEADING_FONT, size: 32, bold: true, color: '17365D' },
        paragraph: {
          spacing: { before: 260, after: 220 },
          outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '5B9BD5', space: 4 } },
        },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { font: HEADING_FONT, size: 28, bold: true, color: '1F2937' },
        paragraph: { spacing: { before: 220, after: 140 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { font: HEADING_FONT, size: 24, bold: true, color: '374151' },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: { config: numberingConfigs },
  sections: [
    {
      properties: {
        page: {
          size: { width: A4_WIDTH, height: A4_HEIGHT },
          margin: {
            top: MARGIN_TOP,
            right: MARGIN_RIGHT,
            bottom: MARGIN_BOTTOM,
            left: MARGIN_LEFT,
            header: 560,
            footer: 560,
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D7E2', space: 3 } },
              children: [
                new TextRun({
                  text: `苏南船舶管理系统 ${metadata.version}｜应用软件说明书（用户操作手册）`,
                  font: BODY_FONT,
                  size: 17,
                  color: '6B7280',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: '第 ', font: BODY_FONT, size: 17, color: '4B5563' }),
                new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 17, color: '4B5563' }),
                new TextRun({ text: ' 页', font: BODY_FONT, size: 17, color: '4B5563' }),
              ],
            }),
          ],
        }),
      },
      children: [...coverChildren(metadata, tocEntries), ...contentChildren],
    },
  ],
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, await Packer.toBuffer(document));

console.log(`generated ${path.relative(process.cwd(), outputPath)}`);
console.log(`top_level_chapters=${topLevelHeadingCount}`);
console.log(`embedded_images=${renderedImageCount}`);
