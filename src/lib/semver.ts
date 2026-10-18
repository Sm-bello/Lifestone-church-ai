/**
 * Compares two semver strings (e.g. "1.0.6" vs "1.0.7", or "v1.0.6" vs "1.0.7").
 * Returns:
 *   1 if a > b (a is newer than b)
 *  -1 if a < b (a is older than b)
 *   0 if a == b
 */
export function compareVersions(a: string, b: string): number {
  const cleanA = a.replace(/^v/i, "").trim()
  const cleanB = b.replace(/^v/i, "").trim()

  const partsA = cleanA.split(".").map((n) => parseInt(n, 10) || 0)
  const partsB = cleanB.split(".").map((n) => parseInt(n, 10) || 0)

  const maxLength = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] ?? 0
    const numB = partsB[i] ?? 0

    if (numA > numB) return 1
    if (numA < numB) return -1
  }

  return 0
}

/**
 * Normalizes version by removing leading 'v'
 */
export function normalizeVersion(v: string): string {
  return v.replace(/^v/i, "").trim()
}
