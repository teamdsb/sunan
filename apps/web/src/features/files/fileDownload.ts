export async function downloadFileFromUrl(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('文件下载失败');
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
