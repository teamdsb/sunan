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
const logger = new Logger('ChinesePdfFont');

let fullFontBytes: Buffer | undefined;

function loadFullFontBytes(): Buffer {
  fullFontBytes ??= readFileSync(notoSansScFontPath);
  return fullFontBytes;
}

export async function createChinesePdfFont(
  documentData: unknown,
): Promise<Buffer> {
  const documentText = JSON.stringify(documentData);
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
