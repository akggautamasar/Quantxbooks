// In-memory view-count accumulator. Avoids Telegram DB writes on every read,
// which cause concurrent-write races across serverless instances that lose book records.
export const viewCounts = new Map<string, number>();
