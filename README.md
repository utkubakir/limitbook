# Order Book Visualizer

Visualize financial order book snapshots from CSV files. Upload market data and scrub through time to examine order book states with interactive charts and playback controls.

## Features

- Upload large CSV files (1.5M+ rows)
- Seek to any point in time instantly
- Horizontal bar chart showing bid/ask depth
- Time-series chart displaying historical liquidity
- Playback controls (play, pause, jump, seek)
- Real-time latency display

## Installation

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## CSV Format

Required columns (case-insensitive, whitespace-tolerant):

- `ts_recv` - Receive timestamp (ISO8601)
- `ts_event` - Event timestamp (ISO8601)
- `bid_px_00` through `bid_px_09` - Bid price levels
- `ask_px_00` through `ask_px_09` - Ask price levels
- `bid_sz_00` through `bid_sz_09` - Bid sizes
- `ask_sz_00` through `ask_sz_09` - Ask sizes

Additional columns are ignored.

Example:
```csv
ts_recv,ts_event,bid_px_00,ask_px_00,bid_sz_00,ask_sz_00,...
2025-06-11T00:00:00.000Z,2025-06-10T23:52:40.065Z,61.00,61.70,1,1,...
```

Notes:
- Each row is a complete snapshot (not incremental updates)
- Missing or zero values are skipped
- Up to 10 levels per side supported

## Usage

1. Upload CSV file
2. Wait for processing
3. Use playback controls to navigate
4. Click "New Upload" to reset

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Recharts
- csv-parse

## Documentation

See [DESIGN.md](./DESIGN.md) for architecture and design decisions.

## License

MIT
