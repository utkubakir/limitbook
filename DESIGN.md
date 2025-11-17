# **Design Document – Order Book Visualization Tool**

## **Overview**

The tool visualizes historical order book snapshots from large CSV datasets (~1.5M rows).
Users upload a file, scrub through time using playback controls, and view:

- **Current order book** (horizontal bar chart of bid/ask levels)
- **Historical liquidity trend** (bid/ask depth time series)

The dataset contains **full top-10 bid/ask levels per row**, so each row is already a **complete snapshot**.

---

## **Architecture**

```
CSV Upload → Stream Parse Snapshots → In-Memory Session → Snapshot-by-Tick REST API
                                                   ↓
                                         1000-bin liquidity history
```

Key idea: **direct snapshot storage** (no event reconstruction).
Tick = row index. Snapshot lookup is O(1).

---

## **Technology Choices**

### **Next.js (App Router) + TypeScript**

- Co-locates UI and API routes in one codebase.
- Strict typing ensures robustness during CSV parsing and charting.
- No need for a separate backend service.

### **csv-parse (streaming mode)**

- Processes large CSVs without loading into memory.
- Handles uneven/missing depth levels reliably.

### **Recharts**

- Declarative API, fast enough for ≤10k points.
- Good fit for bar charts + line charts.

### **Tailwind CSS (optional)**

- Quick, consistent layout and spacing.

---

## **Key Decisions**

### **1. Snapshot-Based Model (not event-sourced)**

The CSV already provides full top-of-book depth (bid_px_00…09, ask_px_00…09).
So we treat each row as the truth:

**tick → snapshots[tick]**

This removes the need for:

- maintaining price maps
- applying deltas
- state reconstruction
- snapshot caching
- event replay

**Reasoning:** simpler, reliable, and far faster to implement.

**Trade-off:** higher memory usage, but acceptable for single-file analysis.

---

### **2. In-Memory Session Storage**

Parsed sessions are stored in an in-memory map.

**Reasoning:**
Fast, zero dependencies, perfect for a take-home environment.

**Trade-off:**
Data disappears on server restart—fine for this use case.

---

### **3. Fixed 1000-Bin History Aggregation**

Full depth time series = ~1–1.5M points → impossible for browser charts.

We aggregate into ~1000 bins:

```
binSize = ceil(totalTicks / 1000)
history[i] = avg(bidDepth), avg(askDepth) over bin[i]
```

**Reasoning:**
Greatly improves chart performance while preserving trend shape.

**Trade-off:**
Reduced granularity, but more readable and responsive.

---

### **4. Header-Normalized CSV Parsing**

Column indices are detected via normalized headers (`trim().toLowerCase()`).
Depth columns are paired (px/sz) per level to avoid misalignment.

**Reasoning:**
Real datasets often contain inconsistencies or missing levels.

---

### **5. Stateless Playback**

Frontend manages tick state and requests snapshots via REST:

- `tick += 1` on Play
- `tick ± 100` for step
- Hit API: `/api/snapshot?sessionId=X&tick=Y`

**Reasoning:**
Simple, predictable, no WebSockets required.

---

## **Performance**

**Upload:**

- CSV parsing: ~3–5s (streaming) (For the test data, it takes a bit more...)
- History binning: O(n), ~1–2s

**Runtime:**

- Snapshot lookup: O(1)
- Snapshot serialization: <1ms
- History chart rendering (1000pts): smooth at 60FPS

---

## **Data Model**

```ts
interface Snapshot {
  tsRecv: string;
  tsEvent: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
}

interface HistoryPoint {
  tick: number;
  bid: number;
  ask: number;
}
```

---

## **API**

**POST /api/upload**
→ Streams CSV → builds snapshots[] → builds 1000-bin history
→ Returns `{ sessionId, totalTicks }`

**GET /api/snapshot?sessionId&tick**
→ Returns snapshot at the given tick

**GET /api/history?sessionId**
→ Returns aggregated liquidity history
