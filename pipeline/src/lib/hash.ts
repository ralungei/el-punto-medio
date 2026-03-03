import { createHash } from "crypto";

export function inputHash(data: string): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}
