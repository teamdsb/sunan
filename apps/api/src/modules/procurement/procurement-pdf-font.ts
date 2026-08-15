import { Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

type SubsetFont = (
  fontBuffer: Buffer,
  text: string,
  options: { targetFormat: 'sfnt' },
) => Promise<Buffer>;

const requireFromHere = createRequire(__filename);
const subsetFont = requireFromHere('subset-font') as SubsetFont;
const notoSansScEntry = requireFromHere.resolve(
  '@expo-google-fonts/noto-sans-sc',
);
const notoSansScFontPath = join(
  dirname(notoSansScEntry),
  '400Regular',
  'NotoSansSC_400Regular.ttf',
);
const logger = new Logger('ProcurementPdfFont');

const staticPdfText = `
苏南船舶管理平台 · 采购单 PROCUREMENT ORDER
采购报表审批单 报表编号 报表摘要 采购总额 采购单数 汇总维度
基本信息 统计条件 其他参数 汇总明细 暂无汇总明细 合计
审批记录 暂无审批记录 审批节点 结果 审批人 审批时间 审批意见 来源
数据说明 本文件基于审批提交时的数据快照生成，后续业务数据变化不会回写本报表。
数据口径 审批单创建时快照 生成时间 第 页
总经办 业务部 财务部 船务部 后勤部 全部部门 未配置 未细分
草稿 已提交 部门已通过 财务已通过 终审已通过 部门通过 终审通过 已驳回 已退回
部门审批 财务审批 总经办审批 终审 通过 驳回 退回
系统内 系统内审批 企业微信 企业微信审批 企业微信原生审批
快照来源 统计维度 维度编码 维度名称 开始日期 结束日期 审批提交快照
船舶 后勤类别 是 否 月报 年报 年 月 年度 项配置 汇总项
申请人 审批状态 提交时间 终审时间 审批渠道 快照生成 报表类型 统计周期 统计部门 无审批意见
状态 周期 部门 申请金额 采购事项 标题 摘要 无 单号 细分 审批方式 费用日期
附件清单 序号 文件名 类型 大小 层级 动作 时间 意见 文本 图片
¥ · （ ） ， 。 ： ； ！ ？ — … - / 0 1 2 3 4 5 6 7 8 9
`;

let fullFontBytes: Buffer | undefined;

function loadFullFontBytes(): Buffer {
  fullFontBytes ??= readFileSync(notoSansScFontPath);
  return fullFontBytes;
}

export async function createProcurementPdfFont(
  documentData: unknown,
): Promise<Buffer> {
  const documentText = `${staticPdfText}\n${JSON.stringify(documentData)}`;
  const uniqueCharacters = [...new Set(documentText)].join('');

  try {
    return await subsetFont(loadFullFontBytes(), uniqueCharacters, {
      targetFormat: 'sfnt',
    });
  } catch (error) {
    logger.warn(
      `PDF font subsetting failed; using the complete font: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    return loadFullFontBytes();
  }
}
