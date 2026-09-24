export type QuoteLine = {
  name: string;
  description: string;
  quantity: number;
  term: string;
  rate: number;
  total: number;
};

export type QuoteAllocation = {
  total: number;
  preProduction: QuoteLine[];
  aiProduction: QuoteLine[];
  postProduction: QuoteLine[];
  sectionTotals: {
    preProduction: number;
    aiProduction: number;
    postProduction: number;
  };
  error?: string;
};

export type QuoteExportInput = {
  projectName: string;
  quote: number;
  duration: number;
  workdays: number;
  deliveryDate: string;
  taxRate: number;
  allocation: QuoteAllocation;
};

const roundHundred = (value: number) => Math.round(value / 100) * 100;

function distribute(total: number, weights: number[]) {
  if (total <= 0) return weights.map(() => 0);
  const raw = weights.map((weight) => (total * weight) / weights.reduce((a, b) => a + b, 0));
  const values = raw.map((value) => Math.floor(value / 100) * 100);
  let remainder = total - values.reduce((sum, value) => sum + value, 0);
  const priorities = raw
    .map((value, index) => ({ index, fraction: value - values[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let cursor = 0; remainder >= 100; cursor += 1) {
    values[priorities[cursor % priorities.length].index] += 100;
    remainder -= 100;
  }
  return values;
}

export function createQuoteAllocation(quote: number, duration: number): QuoteAllocation {
  const total = Math.max(0, roundHundred(quote));
  const seconds = Math.max(0, Math.round(duration));
  const aiFixed = roundHundred(seconds * 300);
  const postFixed = roundHundred(seconds * 400);
  const targetPre = roundHundred(total * 0.3);
  const aiTarget = Math.max(roundHundred(total * 0.4), aiFixed * 2 + 300);
  const targetPost = total - targetPre - roundHundred(total * 0.4);
  const postTarget = Math.max(targetPost, postFixed + 500);
  const preTarget = total - aiTarget - postTarget;

  const base: QuoteAllocation = {
    total,
    preProduction: [],
    aiProduction: [],
    postProduction: [],
    sectionTotals: {
      preProduction: Math.max(0, preTarget),
      aiProduction: aiTarget,
      postProduction: postTarget,
    },
  };

  if (total <= 0) {
    return { ...base, error: "请填写大于 0 的未税报价。" };
  }
  if (seconds <= 0) {
    return { ...base, error: "请填写大于 0 的视频时长。" };
  }
  if (preTarget < 400) {
    return {
      ...base,
      error: `当前报价不足以覆盖 ${seconds} 秒的固定秒价项目，请提高未税报价或缩短视频时长。`,
    };
  }

  const preValues = distribute(preTarget, [8, 15, 12, 10]);
  const aiFlexible = aiTarget - aiFixed * 2;
  const aiValues = distribute(aiFlexible, [30, 40, 40]);
  const postFlexible = postTarget - postFixed;
  const postValues = distribute(postFlexible, [30, 30, 30, 30, 25]);

  return {
    ...base,
    preProduction: [
      ["项目经理", "客户对接、项目监制、制作执行", preValues[0]],
      ["AI创意", "创意策划、文案撰写", preValues[1]],
      ["AI导演", "分镜梳理、脚本制作", preValues[2]],
      ["AIGC美术设计师", "AI视觉把控、AI场景及角色设计", preValues[3]],
    ].map(([name, description, value]) => ({
      name: String(name), description: String(description), quantity: 1, term: "package",
      rate: Number(value), total: Number(value),
    })),
    aiProduction: [
      ["AI场景设定、AI人物形象设定", "根据故事情节设计场景和角色形象", 1, "package", aiValues[0]],
      ["AI风格统一、一致性技术解决", "搭建转绘工作流，统一视觉风格与角色一致性", 1, "package", aiValues[1]],
      ["AI平面分镜生成", "生成效果静帧，完成角色、场景与光影设计", 1, "package", aiValues[2]],
      ["视频迁移转绘", "结合 AI 视频模型与传统工具进行动态迁移", seconds, "秒", 300],
      ["AI动态视频修复、超分", "视频细节修复与画质增强至 4K", seconds, "秒", 300],
    ].map(([name, description, quantity, term, rate]) => ({
      name: String(name), description: String(description), quantity: Number(quantity), term: String(term),
      rate: Number(rate), total: Number(quantity) * Number(rate),
    })),
    postProduction: [
      ["剪辑", "粗剪与精剪", seconds, "秒", 400],
      ["VFX/特效（动效）", "合成 Online、部分镜头特效", 1, "条", postValues[0]],
      ["AE动效制作", "包装动效、MG 动画制作", 1, "条", postValues[1]],
      ["混音/音效设计（含版权音乐*1/年）", "人声混音、音效设计及版权音乐 1 支", 1, "条", postValues[2]],
      ["调色", "统一 AIGC 生成画面的色调", 1, "条", postValues[3]],
      ["包装设计", "二维包装设计", 1, "条", postValues[4]],
    ].map(([name, description, quantity, term, rate]) => ({
      name: String(name), description: String(description), quantity: Number(quantity), term: String(term),
      rate: Number(rate), total: Number(quantity) * Number(rate),
    })),
  };
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "项目";
}

export async function exportQuoteWorkbook(input: QuoteExportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gleam 成本核算器";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("报价单", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    views: [{ showGridLines: false }],
  });

  const layoutScale = 1.12;
  sheet.columns = [
    { key: "a", width: 3 * layoutScale }, { key: "b", width: 27 * layoutScale },
    { key: "c", width: 28 * layoutScale }, { key: "d", width: 9.16071428571429 * layoutScale },
    { key: "e", width: 9.33035714285714 * layoutScale }, { key: "f", width: 10.6607142857143 * layoutScale },
    { key: "g", width: 10.1607142857143 * layoutScale }, { key: "h", width: 22.6607142857143 * layoutScale },
  ];
  sheet.properties.defaultRowHeight = 16.8 * layoutScale;

  const black = "FF000000";
  const darkText = "FF1D1D1F";
  const sectionFill = "FFBFBFBF";
  const summaryFill = "FFE7E7E7";
  const highlightRed = "FFFF0000";
  const descriptionText = "FF3A3A3C";
  const white = "FFFFFFFF";
  const border = { style: "thin" as const, color: { argb: black } };
  const allBorders = { top: border, left: border, bottom: border, right: border };
  const currency = '¥#,##0;[Red](¥#,##0);-';

  const mergeWrite = (range: string, value: string | number) => {
    sheet.mergeCells(range);
    sheet.getCell(range.split(":")[0]).value = value;
  };
  const styleRange = (range: string, options: { fill?: string; bold?: boolean; color?: string; size?: number; align?: "left" | "center" | "right" }) => {
    const target = sheet.getCell(range.split(":")[0]);
    if (options.fill) target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: options.fill } };
    target.font = { name: "微软雅黑", bold: options.bold, color: { argb: options.color ?? darkText }, size: options.size ?? 11 };
    target.alignment = { horizontal: options.align ?? "left", vertical: "middle", wrapText: true };
  };

  mergeWrite("A1:H1", `${input.projectName || "项目"}报价单\nFILM PRODUCTION QUOTATION`);
  sheet.getRow(1).height = 62;
  styleRange("A1", { fill: black, bold: false, color: white, size: 31, align: "center" });
  mergeWrite("A2:D2", "Specification/规格：16:9 AIGC影片");
  mergeWrite("E2:H2", `Shooting DAYS/制作天数：${input.workdays}个工作日`);
  mergeWrite("A3:D3", `Length/长度：1支${input.duration}S`);
  mergeWrite("E3:H3", `DDL/交付日期：${input.deliveryDate || "待定"}`);
  mergeWrite("A4:D4", "Language/语言：双语");
  mergeWrite("E4:H4", "单位：与光同尘 Gleam");
  mergeWrite("A5:H5", "ESTIMATED PRODUCTION COST /制作成本(RMB)");
  styleRange("A5", { fill: sectionFill, bold: false, size: 14, align: "center" });
  mergeWrite("A6:G6", `项目名称：${input.projectName || "未命名项目"}`);
  sheet.getCell("H6").value = "QUOTATION/费用";
  sheet.getCell("H6").alignment = { horizontal: "center", vertical: "middle" };

  const sections = [
    { row: 7, no: 1, name: "前置制作费/Pre-Production & Wrap Costs", subtotal: 20, result: input.allocation.sectionTotals.preProduction },
    { row: 8, no: 2, name: "AI制作费/AI Production", subtotal: 29, result: input.allocation.sectionTotals.aiProduction },
    { row: 9, no: 3, name: "后期制作费/Video Post Production", subtotal: 38, result: input.allocation.sectionTotals.postProduction },
  ];
  sections.forEach((section) => {
    sheet.getCell(`A${section.row}`).value = `${section.no}.`;
    mergeWrite(`B${section.row}:G${section.row}`, section.name);
    sheet.getCell(`H${section.row}`).value = { formula: `H${section.subtotal}`, result: section.result };
    sheet.getCell(`H${section.row}`).numFmt = currency;
  });
  mergeWrite("A10:G10", "Sub Total/合计（不含税）");
  sheet.getCell("H10").value = { formula: "SUM(H7:H9)", result: input.allocation.total };
  mergeWrite("A11:G11", `税收（${input.taxRate}%）`);
  const taxTotal = input.allocation.total * Math.max(0, input.taxRate) / 100;
  sheet.getCell("H11").value = { formula: `H10*${Math.max(0, input.taxRate) / 100}`, result: taxTotal };
  mergeWrite("A12:G12", "Sub Total/合计（含税总价）");
  sheet.getCell("H12").value = { formula: "SUM(H10:H11)", result: input.allocation.total + taxTotal };
  mergeWrite("A13:G13", "整体打包优惠总价");
  sheet.getCell("H13").value = "待填写";
  [10, 11, 12, 13].forEach((row) => {
    styleRange(`A${row}`, { fill: summaryFill, bold: row >= 12, size: 14 });
    sheet.getCell(`H${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: summaryFill } };
    sheet.getCell(`H${row}`).font = { name: "微软雅黑", bold: true, color: { argb: highlightRed }, size: 16 };
    sheet.getCell(`H${row}`).numFmt = currency;
  });

  const headers = ["ITEM", "Description/类型描述", "QTY/数量", "TERM/术语", "RATE/单价", "DAYS/天数", "Total"];
  const writeSection = (config: { titleRow: number; headerRow: number; startRow: number; subtotalRow: number; title: string; lines: QuoteLine[] }) => {
    mergeWrite(`A${config.titleRow}:H${config.titleRow}`, config.title);
    styleRange(`A${config.titleRow}`, { fill: sectionFill, bold: true, size: 14 });
    mergeWrite(`A${config.headerRow}:B${config.headerRow}`, headers[0]);
    headers.slice(1).forEach((header, index) => {
      sheet.getCell(config.headerRow, index + 3).value = header;
    });
    sheet.getRow(config.headerRow).font = { name: "微软雅黑", bold: true, size: 11, color: { argb: darkText } };
    sheet.getRow(config.headerRow).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    config.lines.forEach((line, index) => {
      const row = config.startRow + index;
      mergeWrite(`A${row}:B${row}`, line.name);
      sheet.getCell(`C${row}`).value = line.description;
      sheet.getCell(`D${row}`).value = line.quantity;
      sheet.getCell(`E${row}`).value = line.term;
      sheet.getCell(`F${row}`).value = line.rate;
      sheet.getCell(`G${row}`).value = "/";
      sheet.getCell(`H${row}`).value = { formula: `D${row}*F${row}`, result: line.total };
      sheet.getCell(`F${row}`).numFmt = "#,##0";
      sheet.getCell(`H${row}`).numFmt = currency;
      sheet.getCell(`C${row}`).font = { name: "微软雅黑", size: 11, color: { argb: descriptionText } };
      sheet.getRow(row).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    const subtotalLabelCell = config.subtotalRow === 20 ? `A${config.subtotalRow}` : `F${config.subtotalRow}`;
    if (config.subtotalRow === 20) {
      mergeWrite(`A${config.subtotalRow}:G${config.subtotalRow}`, "Sub Total/共计：");
    } else {
      sheet.mergeCells(`A${config.subtotalRow}:E${config.subtotalRow}`);
      mergeWrite(`F${config.subtotalRow}:G${config.subtotalRow}`, "Sub Total/共计：");
    }
    const sectionTotal = config.lines.reduce((sum, line) => sum + line.total, 0);
    sheet.getCell(`H${config.subtotalRow}`).value = {
      formula: `SUM(H${config.startRow}:H${config.startRow + config.lines.length - 1})`,
      result: sectionTotal,
    };
    sheet.getCell(`H${config.subtotalRow}`).numFmt = currency;
    sheet.getCell(`H${config.subtotalRow}`).font = { name: "微软雅黑", bold: true, color: { argb: highlightRed }, size: 16 };
    sheet.getCell(subtotalLabelCell).font = { name: "微软雅黑", bold: true, color: { argb: darkText }, size: 16 };
    sheet.getCell(subtotalLabelCell).alignment = { horizontal: "right", vertical: "middle" };
  };

  writeSection({ titleRow: 14, headerRow: 15, startRow: 16, subtotalRow: 20, title: "1.人员组", lines: input.allocation.preProduction });
  writeSection({ titleRow: 21, headerRow: 22, startRow: 23, subtotalRow: 29, title: "2.AI Production/AI 制作", lines: input.allocation.aiProduction });
  mergeWrite("A28:H28", "*修改轮次3轮，超出部分需重新计算");
  sheet.getCell("A28").alignment = { horizontal: "right", vertical: "middle" };
  writeSection({ titleRow: 30, headerRow: 31, startRow: 32, subtotalRow: 38, title: "3.Video Post Production/后期制作", lines: input.allocation.postProduction });

  for (let row = 1; row <= 38; row += 1) {
    for (let col = 1; col <= 8; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.border = allBorders;
      cell.font = {
        ...cell.font,
        name: "微软雅黑",
        size: cell.font?.size ?? 11,
        color: cell.font?.color ?? { argb: darkText },
      };
      if (!cell.alignment) cell.alignment = { vertical: "middle", wrapText: true };
    }
  }
  for (let row = 2; row <= 9; row += 1) {
    for (let col = 1; col <= 8; col += 1) {
      sheet.getCell(row, col).font = { ...sheet.getCell(row, col).font, name: "微软雅黑", size: 14 };
    }
  }
  for (let row = 10; row <= 13; row += 1) {
    for (let col = 1; col <= 7; col += 1) {
      sheet.getCell(row, col).font = { ...sheet.getCell(row, col).font, name: "微软雅黑", size: 14 };
    }
  }
  const templateRowHeights: Record<number, number> = {
    1: 73,
    2: 20.4, 3: 20.4, 4: 20.4, 5: 20.4, 6: 20.4, 7: 20.4, 8: 20.4, 9: 20.4,
    10: 23.2, 11: 23.2, 12: 23.2, 13: 23.2, 14: 20.4,
    15: 34, 16: 34, 17: 17, 18: 17, 19: 34.75, 20: 23.2, 21: 20.4,
    23: 34, 24: 34, 25: 51, 26: 51, 27: 51, 28: 17, 29: 23.2, 30: 20.4,
    32: 17, 33: 17, 34: 17, 35: 34, 36: 34, 37: 17, 38: 23.95,
  };
  Object.entries(templateRowHeights).forEach(([row, height]) => {
    sheet.getRow(Number(row)).height = height * layoutScale;
  });
  sheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0, footer: 0 };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${safeFileName(input.projectName)}-${input.duration}秒-报价单.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return blob;
}
