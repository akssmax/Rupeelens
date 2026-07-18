import type { CategoryId } from "../types"
import { extractMerchantName } from "./extract"

interface KeywordRule {
  categoryId: CategoryId
  patterns: RegExp[]
  merchantLabel?: string
}

/** Checked in order — more specific rules (wine) before broader ones (alcohol). */
const KEYWORD_RULES: KeywordRule[] = [
  {
    categoryId: "wine",
    merchantLabel: "Wine",
    patterns: [
      /\bwine\b/i,
      /\bwines?\s*(shop|store|cellar|bar|club)\b/i,
      /\bsommelier\b/i,
      /\bvineyard\b/i,
      /\bvino\b/i,
      /\bsula\s*(vineyards?|wines?)?\b/i,
      /\bgrover\s*zampa\b/i,
      /\bfratelli\s*wines?\b/i,
      /\byork\s*winery\b/i,
      /\bnasik\s*valley\b/i,
    ],
  },
  {
    categoryId: "alcohol",
    merchantLabel: "Alcohol",
    patterns: [
      /\bliquor\b/i,
      /\bliqour\b/i,
      /\bbeer\b/i,
      /\b(?:pub|brewery|brewpub|microbrewery)\b/i,
      /\bbar\s*(?:&|and)\s*restaurant\b/i,
      /\b(?:whisky|whiskey|scotch|rum|vodka|gin|brandy|tequila|imfl)\b/i,
      /\bcocktail\b/i,
      /\balcohol\b/i,
      /\bla\s*liquor\b/i,
      /\bbooze\b/i,
      /\bhipbar\b/i,
      /\bliving\s*liquidz\b/i,
      /\b(?:kingfisher|bira|simba|white\s*owl)\s*(?:beer|strong)?\b/i,
      /\b(?:mcdowell|officers|royal\s*stag|blenders|antiquity)\b/i,
    ],
  },
  {
    categoryId: "food",
    patterns: [
      /\b(?:restaurant|resto|cafe|cafeteria|dhaba|eatery)\b/i,
      /\b(?:dominos|pizza\s*hut|kfc|mcdonald|burger\s*king)\b/i,
    ],
  },
  {
    categoryId: "health",
    patterns: [
      /\b(?:pharmacy|chemist|medplus|apollo\s*pharmacy|medical\s*store)\b/i,
      /\b(?:hospital|clinic|diagnostic|lab\s*test)\b/i,
    ],
  },
  {
    categoryId: "entertainment",
    patterns: [
      /\b(?:pvr|inox|bookmyshow|cinema|multiplex|movie)\b/i,
      /\b(?:gaming|playstation|xbox|steam)\b/i,
    ],
  },
]

export function matchKeywordCategory(
  description: string,
): { categoryId: CategoryId; merchant: string; confidence: number } | undefined {
  const text = description.trim()
  if (!text) return undefined

  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          categoryId: rule.categoryId,
          merchant: rule.merchantLabel ?? extractMerchantName(text),
          confidence: 0.88,
        }
      }
    }
  }

  return undefined
}
