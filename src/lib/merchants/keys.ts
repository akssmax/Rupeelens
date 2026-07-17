export function merchantKeyFromDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/upi\/|imps\/|neft\/|rtgs\/|nach\//gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}
