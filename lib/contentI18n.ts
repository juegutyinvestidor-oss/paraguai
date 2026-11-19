const cache = new Map<string, Record<string, string>>();

export function currentLocale(): string {
  if (typeof document === 'undefined') return 'pt-BR';
  return document.documentElement.lang || 'pt-BR';
}

export async function loadContentTranslations(locale: string): Promise<Record<string, string>> {
  if (locale === 'pt-BR') return {};
  const cached = cache.get(locale);
  if (cached) return cached;

  const loaded = await import(`../content/generated/${locale}.json`);
  const dictionary = ((loaded as {default?: Record<string, string>}).default ?? {}) as Record<string, string>;
  cache.set(locale, dictionary);
  return dictionary;
}

export function localizeRows(table: string, data: unknown, dictionary: Record<string, string>): unknown {
  if (!Object.keys(dictionary).length) return data;

  const localizeRow = (row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const source = row as Record<string, unknown>;
    const localized: Record<string, unknown> = {...source};
    for (const [field, value] of Object.entries(source)) {
      if (typeof value !== 'string' || !value) continue;
      const translated = dictionary[`${table}:${field}:${value}`];
      if (translated) localized[field] = translated;
    }
    return localized;
  };

  if (Array.isArray(data)) return data.map(localizeRow);
  return localizeRow(data);
}
