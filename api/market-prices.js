const SYMBOLS = [
  { key: 'USDJPY', yahoo: 'USDJPY=X' },
  { key: 'EURJPY', yahoo: 'EURJPY=X' },
  { key: 'GBPJPY', yahoo: 'GBPJPY=X' },
  { key: 'XAUUSD', yahoo: 'XAUUSD=X', fallbackYahoo: 'GC=F' },
];

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 KIZASHI/1.0',
      'Accept': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Yahoo ${symbol}: ${response.status}`);
  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo ${symbol}: no result`);

  const closes = (result.indicators?.quote?.[0]?.close || [])
    .map(Number)
    .filter(Number.isFinite);

  const meta = result.meta || {};
  const price = Number(meta.regularMarketPrice ?? closes.at(-1));
  const previous = Number(meta.chartPreviousClose ?? meta.previousClose ?? closes[0] ?? price);
  if (!Number.isFinite(price)) throw new Error(`Yahoo ${symbol}: invalid price`);

  const diff = price - previous;
  const percent = previous ? (diff / previous) * 100 : 0;
  return {
    price,
    previous,
    diff,
    percent,
    history: closes.slice(-24),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  const markets = [];

  for (const item of SYMBOLS) {
    try {
      let quote;
      try {
        quote = await fetchYahoo(item.yahoo);
      } catch (error) {
        if (!item.fallbackYahoo) throw error;
        quote = await fetchYahoo(item.fallbackYahoo);
        quote.sourceNote = 'gold-futures-proxy';
      }
      markets.push({ key: item.key, ...quote });
    } catch {
      // Omit failed symbols; the frontend keeps its researched fallback.
    }
  }

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    markets,
  });
}
