import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import { createChinesePdfFont } from 'src/common/pdf/chinese-pdf-font';

export interface SelfInspectionPrintData {
  recordNo: string;
  title: string;
  summary: string;
  vesselName: string;
  scope: string;
  deadline: string;
  issuer: string;
  executor: string;
  reviewer: string;
  closedAt: string;
  generatedAt: string;
  steps: Array<{
    name: string;
    result: string;
    comment: string;
    operator: string;
    completedAt: string;
  }>;
  photos: Array<{
    name: string;
    category: string;
    uploadedBy: string;
    uploadedAt: string;
    bytes: Buffer;
    mimeType: string;
  }>;
}

export const formatInspectionTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
};

/** 审核后的业务记录，不输出内部 payload 或附件 ID。 */
export async function buildSelfInspectionPdf(
  input: SelfInspectionPrintData,
  paper: 'A4' | 'A3',
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const labels =
    '苏南船舶管理系统 船舶自查整改记录 已审核关闭 单号 船舶 任务标题 检查范围 检查要求 整改期限 下发人 执行人 审核人 完成时间 生成时间 检查与整改结果 审核结论 整改前照片 整改后照片 上传人 上传时间 第 页 共 页 受控副本 无 ： / | - 0123456789 年月日';
  const font = await doc.embedFont(
    await createChinesePdfFont({
      labels,
      ...input,
      photos: input.photos.map((photo) => ({ ...photo, bytes: undefined })),
    }),
  );
  const [width, height] = paper === 'A3' ? [842, 1191] : [595, 842];
  const margin = 44;
  const contentWidth = width - margin * 2;
  const navy = rgb(0.1, 0.2, 0.3),
    gray = rgb(0.38, 0.42, 0.46);
  let page = doc.addPage([width, height]);
  let y = height - 105;
  const header = () => {
    page.drawText('苏南船舶管理系统', {
      x: margin,
      y: height - 38,
      size: 10,
      font,
      color: gray,
    });
    page.drawText('船舶自查整改记录', {
      x: margin,
      y: height - 66,
      size: 20,
      font,
      color: navy,
    });
    page.drawLine({
      start: { x: margin, y: height - 81 },
      end: { x: width - margin, y: height - 81 },
      thickness: 1,
      color: navy,
    });
  };
  header();
  const room = (heightNeeded: number) => {
    if (y - heightNeeded < 58) {
      page = doc.addPage([width, height]);
      y = height - 105;
      header();
    }
  };
  const write = (text: string, size = 11, indent = 0) => {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r/g, '').split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (
          line &&
          font.widthOfTextAtSize(line + character, size) > contentWidth - indent
        ) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
      lines.push(line || ' ');
    }
    for (const line of lines) {
      room(size + 7);
      page.drawText(line, { x: margin + indent, y, size, font, color: navy });
      y -= size + 7;
    }
  };
  const section = (title: string) => {
    room(55);
    y -= 10;
    write(title, 14);
    y -= 4;
  };
  write(`单号：${input.recordNo}`);
  write(`船舶：${input.vesselName}    已审核关闭`);
  write(`任务标题：${input.title}`);
  write(`检查范围：${input.scope}`);
  write(`检查要求：${input.summary}`);
  write(`整改期限：${formatInspectionTime(input.deadline)}`);
  write(`下发人：${input.issuer}`);
  write(`执行人：${input.executor}    审核人：${input.reviewer}`);
  write(`完成时间：${formatInspectionTime(input.closedAt)}`);
  section('检查与整改结果');
  for (const step of input.steps) {
    room(72);
    write(`${step.name}：${step.result}`, 12);
    write(step.comment || '无', 11, 12);
    write(
      `${step.operator}    ${formatInspectionTime(step.completedAt)}`,
      10,
      12,
    );
    y -= 8;
  }
  for (const photo of input.photos) {
    const embedded =
      photo.mimeType === 'image/png'
        ? await doc.embedPng(photo.bytes)
        : await doc.embedJpg(photo.bytes);
    const scale = Math.min(
      contentWidth / embedded.width,
      (paper === 'A3' ? 200 : 240) / embedded.height,
      1,
    );
    const imageWidth = embedded.width * scale,
      imageHeight = embedded.height * scale;
    room(imageHeight + 95);
    section(
      photo.category === 'before_rectification' ? '整改前照片' : '整改后照片',
    );
    write(photo.name, 10);
    room(imageHeight + 40);
    page.drawImage(embedded, {
      x: margin,
      y: y - imageHeight,
      width: imageWidth,
      height: imageHeight,
    });
    y -= imageHeight + 16;
    write(
      `上传人：${photo.uploadedBy}    ${formatInspectionTime(photo.uploadedAt)}`,
      9,
    );
    y -= 8;
  }
  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawText(
      `受控副本 | 生成时间：${formatInspectionTime(input.generatedAt)}`,
      { x: margin, y: 28, size: 8, font, color: gray },
    );
    item.drawText(`第 ${index + 1} 页 / 共 ${pages.length} 页`, {
      x: width - margin - 92,
      y: 28,
      size: 8,
      font,
      color: gray,
    });
  });
  return Buffer.from(await doc.save());
}
