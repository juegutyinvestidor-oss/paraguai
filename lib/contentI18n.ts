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

function mapRows(table: string, data: unknown, dictionary: Record<string, string>, reverse: boolean): unknown {
  if (!Object.keys(dictionary).length) return data;

  const reverseMap = new Map<string, string>();
  if (reverse) {
    for (const [key, value] of Object.entries(dictionary)) {
      if (!key.startsWith(`${table}:`)) continue;
      const separator = key.indexOf(':', table.length + 1);
      if (separator === -1) continue;
      reverseMap.set(`${key.slice(table.length + 1, separator)}:${value}`, key.slice(separator + 1));
    }
  }

  const mapRow = (row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const source = row as Record<string, unknown>;
    const mapped: Record<string, unknown> = {...source};
    for (const [field, value] of Object.entries(source)) {
      if (typeof value !== 'string' || !value) continue;
      if (reverse) {
        const canonical = reverseMap.get(`${field}:${value}`);
        if (canonical !== undefined && canonical !== value) mapped[field] = canonical;
      } else {
        const translated = dictionary[`${table}:${field}:${value}`];
        if (translated) mapped[field] = translated;
      }
    }
    return mapped;
  };

  if (Array.isArray(data)) return data.map(mapRow);
  return mapRow(data);
}

export function localizeRows(table: string, data: unknown, dictionary: Record<string, string>): unknown {
  return mapRows(table, data, dictionary, false);
}

export function delocalizeRows(table: string, data: unknown, dictionary: Record<string, string>): unknown {
  return mapRows(table, data, dictionary, true);
}
