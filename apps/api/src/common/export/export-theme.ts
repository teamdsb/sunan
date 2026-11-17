import { rgb, type RGB } from 'pdf-lib';

/** Shared visual tokens for generated files. Keep business data out of this module. */
export const EXPORT_THEME = {
  navy: '#0E263F',
  blue: '#1660D7',
  pale: '#EFF7FF',
  stripe: '#F8FAFC',
  line: '#D6E0EE',
  muted: '#5C6E87',
  warning: '#FFF4DC',
  warningText: '#925600',
  font: '微软雅黑',
} as const;

export function pdfColor(hex: string): RGB {
  const value = hex.replace('#', '');
  return rgb(
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  );
}

export function pdfOperatorColor(hex: string): string {
  const value = hex.replace('#', '');
  return [0, 2, 4]
    .map((offset) => (Number.parseInt(value.slice(offset, offset + 2), 16) / 255).toFixed(4))
    .join(' ');
}

export const EXPORT_PDF_THEME = {
  navy: pdfColor(EXPORT_THEME.navy),
  blue: pdfColor(EXPORT_THEME.blue),
  pale: pdfColor(EXPORT_THEME.pale),
  stripe: pdfColor(EXPORT_THEME.stripe),
  line: pdfColor(EXPORT_THEME.line),
  muted: pdfColor(EXPORT_THEME.muted),
  warning: pdfColor(EXPORT_THEME.warning),
  warningText: pdfColor(EXPORT_THEME.warningText),
  white: rgb(1, 1, 1),
} as const;
