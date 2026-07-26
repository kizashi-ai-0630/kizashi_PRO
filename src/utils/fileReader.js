const decoders = ['utf-8', 'shift_jis', 'windows-1252'];
const MAX_FILE_SIZE = 12 * 1024 * 1024;

export function detectTradeFileType(file) {
  const name = file?.name?.toLowerCase() || '';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  return 'unknown';
}

export async function readTradeFile(file) {
  if (!file) throw new Error('取引履歴ファイルが選択されていません。');

  const type = detectTradeFileType(file);
  if (type === 'unknown') {
    throw new Error('CSV（MT5）またはHTML / HTM（MT4詳細レポート）を選択してください。');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('ファイルは12MB以下にしてください。');
  }

  const buffer = await file.arrayBuffer();
  let fallback = '';
  for (const encoding of decoders) {
    try {
      const text = new TextDecoder(encoding, { fatal: encoding === 'utf-8' }).decode(buffer);
      if (!fallback) fallback = text;
      if (!text.includes('�')) return { text, type };
    } catch {
      // 次の文字コードを試す
    }
  }
  return { text: fallback || new TextDecoder().decode(buffer), type };
}

// 9.9以前との互換用
export async function readCsvFile(file) {
  const result = await readTradeFile(file);
  if (result.type !== 'csv') throw new Error('CSV形式のファイルを選択してください。');
  return result.text;
}
