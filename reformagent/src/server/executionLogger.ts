import fs from "fs";
import path from "path";

export interface ExecutionLogEntry {
  executionId: string | number;
  fileName: string;
  status: "success" | "error";
  startedAt: string;
  stoppedAt: string;
  durationMs: number;
  proposalsCount: number;
  error?: string | null;
  timestamp: string;
}

const LOG_FILE = path.resolve(__dirname, "../../workflows/execution_history.json");

export function logExtractionExecution(entry: ExecutionLogEntry): void {
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let history: ExecutionLogEntry[] = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        const content = fs.readFileSync(LOG_FILE, "utf8");
        history = JSON.parse(content);
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
    }

    // Prepend newest execution
    history.unshift(entry);

    // Keep up to 200 execution records
    if (history.length > 200) {
      history = history.slice(0, 200);
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2), "utf8");
    console.log(`[ExecutionLogger] Logged execution #${entry.executionId} (${entry.status}) for "${entry.fileName}"`);
  } catch (err) {
    console.error("[ExecutionLogger] Failed to write execution log:", err);
  }
}

export function getExecutionHistory(): ExecutionLogEntry[] {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, "utf8");
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}
