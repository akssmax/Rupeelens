import type { BankId } from "../types"
import { normalizeHeader } from "./normalize"

interface Fingerprint {
  bank: BankId
  score: (headers: string[], sample: string, filename: string) => number
}

const fingerprints: Fingerprint[] = [
  {
    bank: "axis",
    score: (headers, sample, filename) => {
      let s = 0
      const h = headers.join(" ")
      if (h.includes("tran date") || h.includes("transaction date")) s += 3
      if (h.includes("particulars")) s += 3
      if (/\bdr\b/.test(h) && /\bcr\b/.test(h)) s += 3
      if (/\bbal\b/.test(h) || h.includes("balance")) s += 1
      if (h.includes("chq") || h.includes("cheque") || h.includes("chqno")) s += 2
      if (h.includes("value date")) s += 1
      if (/axis|utib|acctstatement/i.test(sample) || /axis|acctstatement/i.test(filename))
        s += 4
      return s
    },
  },
  {
    bank: "hdfc",
    score: (headers, sample, filename) => {
      let s = 0
      const h = headers.join(" ")
      if (h.includes("narration")) s += 2
      if (h.includes("chq ref") || h.includes("chq/ref")) s += 3
      if (h.includes("withdrawal amt") || h.includes("deposit amt")) s += 4
      if (h.includes("value dt")) s += 2
      if (/hdfc/i.test(sample) || /hdfc/i.test(filename)) s += 4
      return s
    },
  },
  {
    bank: "icici",
    score: (headers, sample, filename) => {
      let s = 0
      const h = headers.join(" ")
      if (h.includes("transaction remarks") || h.includes("remarks")) s += 2
      if (h.includes("withdrawal amount") && h.includes("deposit amount"))
        s += 3
      if (h.includes("s no") || h.includes("sno")) s += 1
      if (/icici/i.test(sample) || /icici/i.test(filename)) s += 4
      return s
    },
  },
  {
    bank: "sbi",
    score: (headers, sample, filename) => {
      let s = 0
      const h = headers.join(" ")
      if (h.includes("ref no") || h.includes("txn id")) s += 2
      if (h.includes("debit") && h.includes("credit") && h.includes("balance"))
        s += 2
      if (/state bank|sbi/i.test(sample) || /sbi/i.test(filename)) s += 4
      return s
    },
  },
  {
    bank: "kotak",
    score: (headers, sample, filename) => {
      let s = 0
      if (/kotak/i.test(sample) || /kotak/i.test(filename)) s += 5
      const h = headers.join(" ")
      if (h.includes("description") && h.includes("amount")) s += 1
      return s
    },
  },
  {
    bank: "yes",
    score: (_headers, sample, filename) => {
      let s = 0
      if (/yes\s*bank/i.test(sample) || /yesbank/i.test(filename)) s += 5
      return s
    },
  },
  {
    bank: "indusind",
    score: (_headers, sample, filename) => {
      let s = 0
      if (/indusind/i.test(sample) || /indusind/i.test(filename)) s += 5
      return s
    },
  },
  {
    bank: "idfc",
    score: (_headers, sample, filename) => {
      let s = 0
      if (/idfc/i.test(sample) || /idfc/i.test(filename)) s += 5
      return s
    },
  },
]

export function detectBank(params: {
  headers: string[]
  sampleText: string
  filename: string
}): BankId {
  const headers = params.headers.map(normalizeHeader)
  let best: BankId = "generic"
  let bestScore = 0

  for (const fp of fingerprints) {
    const score = fp.score(headers, params.sampleText, params.filename)
    if (score > bestScore) {
      bestScore = score
      best = fp.bank
    }
  }

  return bestScore >= 3 ? best : "generic"
}
