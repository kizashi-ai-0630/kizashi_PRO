export { parseCSV } from './parsers/csvParser';
export { parseMT4HTML } from './parsers/mt4HtmlParser';
import { parseCSV } from './parsers/csvParser';
import { parseMT4HTML } from './parsers/mt4HtmlParser';

export function parseTradeFile(text, type) {
  if (type === 'html') return parseMT4HTML(text);
  if (type === 'csv') return parseCSV(text);
  throw new Error('未対応の取引履歴形式です。');
}
