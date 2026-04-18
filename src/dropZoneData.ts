export function extractDroppedFileUris(payloads: string[]): string[] {
  const uris = new Set<string>();
  const fileUriPattern = /file:\/\/[^\s"'`,;\][(){}<>]+/g;

  for (const payload of payloads) {
    if (!payload.trim()) {
      continue;
    }

    const matches = payload.match(fileUriPattern);

    if (!matches?.length) {
      continue;
    }

    for (const match of matches) {
      uris.add(match);
    }
  }

  return [...uris];
}
