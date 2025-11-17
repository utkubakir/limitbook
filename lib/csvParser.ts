import { parse } from "csv-parse";
import { Snapshot, BookLevel, HistoryPoint } from "./types";
import * as jschardet from "jschardet";

const TARGET_HISTORY_BINS = 1000;

export interface ParseResult {
  snapshots: Snapshot[];
  bidDepth: number[];
  askDepth: number[];
  history: HistoryPoint[];
  error?: string;
}

export interface ParseProgress {
  bytesProcessed: number;
  totalBytes: number;
  linesProcessed: number;
  percentComplete: number;
}

interface LevelIndices {
  px: number;
  sz: number;
}

interface ColumnIndices {
  tsRecv: number;
  tsEvent: number;
  bid: LevelIndices[]; // paired px/sz indices for bid levels
  ask: LevelIndices[]; // paired px/sz indices for ask levels
}

export async function parseCSVStream(
  stream: ReadableStream<Uint8Array>,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParseResult> {
  console.log('[CSV Parser] Starting CSV stream parsing...');
  return new Promise((resolve) => {
    const snapshots: Snapshot[] = [];
    const bidDepth: number[] = [];
    const askDepth: number[] = [];
    let columnIndices: ColumnIndices | null = null;
    let firstRecord = true;
    let decoder: TextDecoder | null = null;
    let buffer = "";
    let totalBytes = 0;
    let bytesProcessed = 0;
    let linesProcessed = 0;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false, // Keep as strings initially for better control
    });

    parser.on("readable", function () {
      let record;
      let recordCount = 0;
      while ((record = parser.read()) !== null) {
        try {
          // Build column indices from first record
          if (firstRecord) {
            columnIndices = buildColumnIndices(Object.keys(record));
            firstRecord = false;
            console.log('[CSV Parser] Column indices built successfully');

            if (!columnIndices) {
              resolve({
                snapshots: [],
                bidDepth: [],
                askDepth: [],
                history: [],
                error: "Failed to find required columns (ts_recv, ts_event, bid_px_*, ask_px_*, bid_sz_*, ask_sz_*)",
              });
              parser.destroy();
              return;
            }
          }

          if (!columnIndices) {
            throw new Error("Column indices not initialized");
          }

          const snapshot = parseSnapshot(record, columnIndices);
          snapshots.push(snapshot);

          // Calculate total depth for this snapshot
          const bidTotal = snapshot.bids.reduce((sum, level) => sum + level.size, 0);
          const askTotal = snapshot.asks.reduce((sum, level) => sum + level.size, 0);
          bidDepth.push(bidTotal);
          askDepth.push(askTotal);
          recordCount++;
        } catch (err) {
          resolve({
            snapshots: [],
            bidDepth: [],
            askDepth: [],
            history: [],
            error: `Failed to parse record: ${err instanceof Error ? err.message : String(err)}`,
          });
          parser.destroy();
          return;
        }
      }

      if (recordCount > 0 && snapshots.length % 50000 === 0) {
        console.log(`[CSV Parser] Parsed ${snapshots.length.toLocaleString()} snapshots so far`);
      }
    });

    parser.on("error", function (err) {
      console.error('[CSV Parser] CSV parse error:', err);
      resolve({
        snapshots: [],
        bidDepth: [],
        askDepth: [],
        history: [],
        error: `CSV parse error: ${err.message}`,
      });
    });

    parser.on("end", function () {
      console.log(`[CSV Parser] Parsing complete. Snapshots: ${snapshots.length}`);
      // Aggregate into history bins
      const history = aggregateHistory(bidDepth, askDepth, TARGET_HISTORY_BINS);
      resolve({ snapshots, bidDepth, askDepth, history });
    });

    const reader = stream.getReader();

    const processStream = async () => {
      try {
        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`[CSV Parser] Stream reading complete. Finalizing parser...`);
            if (buffer) {
              parser.write(buffer);
            }
            parser.end();
            break;
          }

          // Detect encoding from first chunk
          if (isFirstChunk) {
            isFirstChunk = false;
            totalBytes = value.length;

            console.log(`[CSV Parser] First chunk size: ${value.length} bytes`);

            // Only sample first 64KB for encoding detection to avoid memory issues
            // This is more than enough to detect encoding accurately
            const sampleSize = Math.min(value.length, 64 * 1024);
            const sample = value.slice(0, sampleSize);

            const detected = jschardet.detect(Buffer.from(sample));
            const encoding = detected.encoding?.toLowerCase() || 'utf-8';
            const confidence = detected.confidence || 0;

            // Use detected encoding if confidence is reasonable, otherwise fallback to UTF-8
            const finalEncoding = confidence > 0.5 ? encoding : 'utf-8';

            console.log(`[CSV Parser] Detected encoding: ${encoding} (confidence: ${confidence}), using: ${finalEncoding}`);

            try {
              decoder = new TextDecoder(finalEncoding);
            } catch {
              // If the detected encoding is not supported, fallback to UTF-8
              console.warn(`[CSV Parser] Encoding ${finalEncoding} not supported, falling back to UTF-8`);
              decoder = new TextDecoder('utf-8');
            }
          }

          if (!decoder) {
            throw new Error("Decoder not initialized");
          }

          // Process large chunks in smaller batches to avoid string size limits
          // The browser may provide the entire file as one chunk
          const MAX_BATCH_SIZE = 10 * 1024 * 1024; // 10MB batches
          let offset = 0;

          while (offset < value.length) {
            const batchEnd = Math.min(offset + MAX_BATCH_SIZE, value.length);
            const batch = value.slice(offset, batchEnd);
            const isLastBatch = batchEnd === value.length;

            // Decode this batch
            const decodedChunk = decoder.decode(batch, { stream: !isLastBatch });

            if (offset === 0) {
              console.log(`[CSV Parser] Processing value in batches. Total size: ${value.length} bytes, first decoded batch: ${decodedChunk.length} chars`);
            }

            buffer += decodedChunk;

            // Process complete lines - handle all line ending formats (\r\n, \n, \r)
            const lines = buffer.split(/\r?\n|\r/);
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            if (offset === 0 && lines.length > 0) {
              console.log(`[CSV Parser] Found ${lines.length} lines in first batch, remaining buffer: ${buffer.length} chars`);
            }

            // Write lines to parser with backpressure handling
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.trim()) {
                const canContinue = parser.write(line + "\n");
                linesProcessed++;

                // If parser buffer is full, wait for it to drain
                if (!canContinue) {
                  await new Promise<void>((resolve) => {
                    parser.once('drain', resolve);
                  });
                }

                // Yield to event loop every 1000 lines to prevent blocking
                if (i > 0 && i % 1000 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              }
            }

            // Safety check AFTER processing lines: if the incomplete line (buffer)
            // exceeds 50MB, the file likely has no line breaks or is corrupted
            if (buffer.length > 50 * 1024 * 1024) {
              console.error(`[CSV Parser] Incomplete line buffer size: ${buffer.length} bytes - exceeds 50MB limit`);
              throw new Error(
                "File has an extremely long line without line breaks or invalid format. " +
                "Please ensure the CSV has proper line breaks (newlines)."
              );
            }

            bytesProcessed += batch.length;
            offset = batchEnd;

            // Report progress
            if (onProgress && totalBytes > 0) {
              const percentComplete = Math.round((bytesProcessed / totalBytes) * 100);
              onProgress({
                bytesProcessed,
                totalBytes,
                linesProcessed,
                percentComplete,
              });
            }

            // Log progress every 50MB processed
            if (offset % (50 * 1024 * 1024) < MAX_BATCH_SIZE || offset === value.length) {
              console.log(`[CSV Parser] Progress: ${Math.round((bytesProcessed / totalBytes) * 100)}%, ${linesProcessed.toLocaleString()} lines, offset ${offset.toLocaleString()}/${totalBytes.toLocaleString()}`);
            }
          }
        }
      } catch (err) {
        console.error('[CSV Parser] Stream processing error:', err);
        resolve({
          snapshots: [],
          bidDepth: [],
          askDepth: [],
          history: [],
          error: `Stream error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    };

    processStream();
  });
}

function buildColumnIndices(headers: string[]): ColumnIndices | null {
  // Normalize headers: trim whitespace and convert to lowercase
  // This handles variations in whitespace, case, and potential BOM issues
  const normalized = headers.map((h) => h.trim().toLowerCase());

  // Find timestamp columns
  const tsRecvIdx = normalized.indexOf("ts_recv");
  const tsEventIdx = normalized.indexOf("ts_event");

  if (tsRecvIdx === -1 || tsEventIdx === -1) {
    return null;
  }

  const bid: LevelIndices[] = [];
  const ask: LevelIndices[] = [];

  // Find bid/ask price and size columns (00 through 09)
  // Pair them together to ensure alignment and prevent mismatches
  for (let i = 0; i < 10; i++) {
    const suffix = i.toString().padStart(2, "0");

    const bidPxIdx = normalized.indexOf(`bid_px_${suffix}`);
    const bidSzIdx = normalized.indexOf(`bid_sz_${suffix}`);

    // Only add if BOTH px and sz exist for this level
    if (bidPxIdx !== -1 && bidSzIdx !== -1) {
      bid.push({ px: bidPxIdx, sz: bidSzIdx });
    }

    const askPxIdx = normalized.indexOf(`ask_px_${suffix}`);
    const askSzIdx = normalized.indexOf(`ask_sz_${suffix}`);

    // Only add if BOTH px and sz exist for this level
    if (askPxIdx !== -1 && askSzIdx !== -1) {
      ask.push({ px: askPxIdx, sz: askSzIdx });
    }
  }

  // Verify we found at least some depth columns
  if (bid.length === 0 && ask.length === 0) {
    return null;
  }

  return { tsRecv: tsRecvIdx, tsEvent: tsEventIdx, bid, ask };
}

function parseSnapshot(
  record: Record<string, string>,
  indices: ColumnIndices,
): Snapshot {
  const values = Object.values(record);

  const tsRecv = values[indices.tsRecv];
  const tsEvent = values[indices.tsEvent];

  if (!tsRecv || !tsEvent) {
    throw new Error("Missing timestamp fields");
  }

  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];

  // Parse bid levels using paired indices
  // This ensures px and sz are always aligned correctly
  for (const level of indices.bid) {
    const priceStr = values[level.px];
    const sizeStr = values[level.sz];

    // Skip if price is missing, empty, or zero
    if (!priceStr || priceStr.trim() === "" || priceStr === "0") {
      continue;
    }

    const price = parseFloat(priceStr);
    const size = parseFloat(sizeStr || "0");

    // Skip if invalid or zero
    if (isNaN(price) || isNaN(size) || price === 0 || size === 0) {
      continue;
    }

    bids.push({ price, size });
  }

  // Parse ask levels using paired indices
  // This ensures px and sz are always aligned correctly
  for (const level of indices.ask) {
    const priceStr = values[level.px];
    const sizeStr = values[level.sz];

    // Skip if price is missing, empty, or zero
    if (!priceStr || priceStr.trim() === "" || priceStr === "0") {
      continue;
    }

    const price = parseFloat(priceStr);
    const size = parseFloat(sizeStr || "0");

    // Skip if invalid or zero
    if (isNaN(price) || isNaN(size) || price === 0 || size === 0) {
      continue;
    }

    asks.push({ price, size });
  }

  return {
    tsRecv,
    tsEvent,
    bids,
    asks,
  };
}

function aggregateHistory(
  bidDepth: number[],
  askDepth: number[],
  targetBins: number,
): HistoryPoint[] {
  const totalTicks = bidDepth.length;

  if (totalTicks === 0) {
    return [];
  }

  // If we have fewer ticks than target bins, return all points
  if (totalTicks <= targetBins) {
    return bidDepth.map((bid, tick) => ({
      tick,
      bid,
      ask: askDepth[tick],
    }));
  }

  const binSize = Math.ceil(totalTicks / targetBins);
  const history: HistoryPoint[] = [];

  for (let binStart = 0; binStart < totalTicks; binStart += binSize) {
    const binEnd = Math.min(binStart + binSize, totalTicks);
    let bidSum = 0;
    let askSum = 0;
    let count = 0;

    // Average depths within this bin
    for (let tick = binStart; tick < binEnd; tick++) {
      bidSum += bidDepth[tick];
      askSum += askDepth[tick];
      count++;
    }

    history.push({
      tick: binStart, // Use bin start as representative tick
      bid: bidSum / count,
      ask: askSum / count,
    });
  }

  return history;
}
