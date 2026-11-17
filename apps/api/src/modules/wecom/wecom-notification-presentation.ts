export interface WecomNotificationPresentationInput {
  sourceType?: string;
  title: string;
  description: string;
  btnText?: string;
}

export interface WecomNotificationPresentation {
  title: string;
  description: string;
  btnText: string;
}

const moduleLabels: Record<string, string> = {
  certificate_reminder: '证照提醒',
  procurement: '采购管理',
  plan_task: '工作平台',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function normalizeDescription(description: string): string {
  const value = description.trim();
  if (!value) return '<div class="normal">请打开系统查看详情</div>';
  if (/<(?:div|p|br)\b/i.test(value)) return value;
  return value
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => `<div class="${index === 0 ? 'gray' : 'normal'}">${escapeHtml(line.trim())}</div>`)
    .join('');
}

export function presentWecomNotification(
  input: WecomNotificationPresentationInput,
): WecomNotificationPresentation {
  const label = input.sourceType ? moduleLabels[input.sourceType] : undefined;
  const title = input.title.trim();
  return {
    title: label && !title.startsWith(`[${label}]`)
      ? `[${label}] · ${title}`
      : title || (label ? `[${label}] · 系统通知` : '系统通知'),
    description: normalizeDescription(input.description),
    btnText: input.btnText?.trim() || '查看详情',
  };
}
