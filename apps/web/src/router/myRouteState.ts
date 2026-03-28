type SearchValue = string | number | boolean | null | undefined;

export function readSearchParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue = '',
): string {
  return searchParams.get(key) ?? defaultValue;
}

export function updateSearchParams(
  currentSearch: string,
  updates: Record<string, SearchValue>,
): string {
  const nextSearchParams = new URLSearchParams(currentSearch);

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') {
      nextSearchParams.delete(key);
      continue;
    }

    nextSearchParams.set(key, String(value));
  }

  const search = nextSearchParams.toString();
  return search ? `?${search}` : '';
}

export function buildDetailHref(listPath: string, id: string, currentSearch = ''): string {
  const backTo = encodeURIComponent(`${listPath}${currentSearch}`);
  return `${listPath}/${id}?backTo=${backTo}`;
}

export function resolveBackHref(listPath: string, currentSearch = ''): string {
  const searchParams = new URLSearchParams(currentSearch);
  return searchParams.get('backTo') || listPath;
}
