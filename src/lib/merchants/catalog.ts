import type { CategoryId } from "../types"

export interface MerchantProfile {
  id: string
  name: string
  aliases: string[]
  categoryId: CategoryId
  /** Domain used for favicon / logo lookup */
  domain: string
  isSubscription?: boolean
}

/**
 * Curated Indian + global merchants for instant categorize + logos.
 * Matching is alias-based against extracted narration tokens.
 */
export const MERCHANT_CATALOG: MerchantProfile[] = [
  {
    id: "blinkit",
    name: "Blinkit",
    aliases: ["blinkit", "grofers"],
    categoryId: "groceries",
    domain: "blinkit.com",
  },
  {
    id: "swiggy",
    name: "Swiggy",
    aliases: ["swiggy", "swiggystores", "instamart"],
    categoryId: "food",
    domain: "swiggy.com",
  },
  {
    id: "zomato",
    name: "Zomato",
    aliases: ["zomato", "zomatopay", "eternal"],
    categoryId: "food",
    domain: "zomato.com",
  },
  {
    id: "zepto",
    name: "Zepto",
    aliases: ["zepto"],
    categoryId: "groceries",
    domain: "zeptonow.com",
  },
  {
    id: "bigbasket",
    name: "BigBasket",
    aliases: ["bigbasket", "bbdaily"],
    categoryId: "groceries",
    domain: "bigbasket.com",
  },
  {
    id: "amazon",
    name: "Amazon",
    aliases: ["amazon", "amazonpay", "amzn"],
    categoryId: "shopping",
    domain: "amazon.in",
  },
  {
    id: "amazon-prime",
    name: "Amazon Prime",
    aliases: ["amazon prime", "primevideo", "prime video"],
    categoryId: "subscriptions",
    domain: "primevideo.com",
    isSubscription: true,
  },
  {
    id: "flipkart",
    name: "Flipkart",
    aliases: ["flipkart", "fkrt"],
    categoryId: "shopping",
    domain: "flipkart.com",
  },
  {
    id: "myntra",
    name: "Myntra",
    aliases: ["myntra"],
    categoryId: "shopping",
    domain: "myntra.com",
  },
  {
    id: "netflix",
    name: "Netflix",
    aliases: ["netflix"],
    categoryId: "subscriptions",
    domain: "netflix.com",
    isSubscription: true,
  },
  {
    id: "spotify",
    name: "Spotify",
    aliases: ["spotify"],
    categoryId: "subscriptions",
    domain: "spotify.com",
    isSubscription: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    aliases: ["youtube", "youtubepremium", "google play"],
    categoryId: "subscriptions",
    domain: "youtube.com",
    isSubscription: true,
  },
  {
    id: "hotstar",
    name: "JioHotstar",
    aliases: ["hotstar", "jiohotstar", "disney"],
    categoryId: "subscriptions",
    domain: "hotstar.com",
    isSubscription: true,
  },
  {
    id: "uber",
    name: "Uber",
    aliases: ["uber", "uberindia"],
    categoryId: "transport",
    domain: "uber.com",
  },
  {
    id: "ola",
    name: "Ola",
    aliases: ["ola", "olacabs"],
    categoryId: "transport",
    domain: "olacabs.com",
  },
  {
    id: "rapido",
    name: "Rapido",
    aliases: ["rapido"],
    categoryId: "transport",
    domain: "rapido.bike",
  },
  {
    id: "irctc",
    name: "IRCTC",
    aliases: ["irctc"],
    categoryId: "travel",
    domain: "irctc.co.in",
  },
  {
    id: "makemytrip",
    name: "MakeMyTrip",
    aliases: ["makemytrip", "mmt"],
    categoryId: "travel",
    domain: "makemytrip.com",
  },
  {
    id: "safe-gold",
    name: "SafeGold",
    aliases: ["safe gold", "safegold"],
    categoryId: "investments",
    domain: "safegold.com",
  },
  {
    id: "groww",
    name: "Groww",
    aliases: ["groww"],
    categoryId: "investments",
    domain: "groww.in",
  },
  {
    id: "zerodha",
    name: "Zerodha",
    aliases: ["zerodha", "coin"],
    categoryId: "investments",
    domain: "zerodha.com",
  },
  {
    id: "mutual-funds",
    name: "Mutual Funds",
    aliases: ["mutual funds", "mutualfunds", "iccl", "camsonline", "kfintech"],
    categoryId: "investments",
    domain: "groww.in",
  },
  {
    id: "tata-1mg",
    name: "Tata 1mg",
    aliases: ["tata 1mg", "1mg", "onemg"],
    categoryId: "health",
    domain: "1mg.com",
  },
  {
    id: "pharmeasy",
    name: "PharmEasy",
    aliases: ["pharmeasy"],
    categoryId: "health",
    domain: "pharmeasy.in",
  },
  {
    id: "jio",
    name: "Jio",
    aliases: ["jio", "jiofiber", "reliancejio", "myjio"],
    categoryId: "utilities",
    domain: "jio.com",
  },
  {
    id: "airtel",
    name: "Airtel",
    aliases: ["airtel"],
    categoryId: "utilities",
    domain: "airtel.in",
  },
  {
    id: "act",
    name: "ACT Fibernet",
    aliases: ["act fibernet", "actbroadband"],
    categoryId: "utilities",
    domain: "actcorp.in",
  },
  {
    id: "bescom",
    name: "Electricity",
    aliases: ["bescom", "tneb", "mahavitaran", "tata power", "bses"],
    categoryId: "utilities",
    domain: "bescom.co.in",
  },
  {
    id: "apple",
    name: "Apple",
    aliases: ["apple.com", "apple", "icloud"],
    categoryId: "subscriptions",
    domain: "apple.com",
    isSubscription: true,
  },
  {
    id: "google",
    name: "Google",
    aliases: ["google one", "google.com", "google"],
    categoryId: "subscriptions",
    domain: "google.com",
  },
  {
    id: "atm",
    name: "ATM Cash",
    aliases: ["atm wdl", "atm-cash", "cash wdl", "nwdl"],
    categoryId: "cash",
    domain: "axisbank.com",
  },
  {
    id: "living-liquidz",
    name: "Living Liquidz",
    aliases: ["living liquidz", "livingliquidz"],
    categoryId: "alcohol",
    domain: "livingliquidz.com",
  },
  {
    id: "hipbar",
    name: "HipBar",
    aliases: ["hipbar"],
    categoryId: "alcohol",
    domain: "hipbar.in",
  },
  {
    id: "beer-cafe",
    name: "The Beer Cafe",
    aliases: ["beer cafe", "thebeercafe"],
    categoryId: "alcohol",
    domain: "thebeercafe.com",
  },
  {
    id: "sula",
    name: "Sula Vineyards",
    aliases: ["sula vineyards", "sula wines", "sula"],
    categoryId: "wine",
    domain: "sula.com",
  },
  {
    id: "grover-zampa",
    name: "Grover Zampa",
    aliases: ["grover zampa", "groverzampa"],
    categoryId: "wine",
    domain: "groverzampa.com",
  },
  {
    id: "fratelli",
    name: "Fratelli Wines",
    aliases: ["fratelli wines", "fratelli"],
    categoryId: "wine",
    domain: "fratelliwines.in",
  },
]

const RANKED_CATALOG = [...MERCHANT_CATALOG].sort(
  (a, b) =>
    Math.max(...b.aliases.map((x) => x.length)) -
    Math.max(...a.aliases.map((x) => x.length)),
)

export function findCatalogMerchant(
  text: string,
): MerchantProfile | undefined {
  const hay = text.toLowerCase().replace(/\s+/g, " ")
  for (const m of RANKED_CATALOG) {
    if (m.aliases.some((a) => hay.includes(a))) return m
  }
  return undefined
}
