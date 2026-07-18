import { memo, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Banknote,
  Beer,
  Bus,
  Clapperboard,
  HeartPulse,
  Home,
  Landmark,
  MoreHorizontal,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Utensils,
  Wallet,
  Wifi,
  Wine,
} from "lucide-react"
import { findCatalogMerchant } from "@/lib/merchants/catalog"
import {
  categoryAccent,
  looksLikePersonName,
  merchantInitials,
} from "@/lib/merchants/logo"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

const CATEGORY_ICONS: Partial<Record<CategoryId, LucideIcon>> = {
  food: Utensils,
  groceries: ShoppingCart,
  transport: Bus,
  shopping: ShoppingBag,
  rent: Home,
  utilities: Wifi,
  entertainment: Clapperboard,
  health: HeartPulse,
  travel: Plane,
  wine: Wine,
  alcohol: Beer,
  transfers: UserRound,
  salary: Landmark,
  investments: TrendingUp,
  subscriptions: Repeat,
  fees: Receipt,
  cash: Banknote,
  other: MoreHorizontal,
  uncategorized: Wallet,
}

export const MerchantAvatar = memo(function MerchantAvatar({
  merchant,
  description,
  categoryId,
  className,
}: {
  merchant?: string
  description?: string
  categoryId?: CategoryId
  className?: string
}) {
  const label = merchant || description || "?"
  const text = `${merchant ?? ""} ${description ?? ""}`.trim()
  const catalog = useMemo(() => findCatalogMerchant(text), [text])
  const resolvedCategory = categoryId ?? catalog?.categoryId
  const src = catalog?.domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(catalog.domain)}&sz=128`
    : undefined
  const [failed, setFailed] = useState(false)
  const isPerson = looksLikePersonName(merchant, description)

  const showImage = Boolean(src) && !failed
  const Icon = isPerson
    ? UserRound
    : (CATEGORY_ICONS[resolvedCategory ?? "uncategorized"] ?? Wallet)
  const accent = isPerson
    ? "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
    : categoryAccent(resolvedCategory)

  return (
    <div
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold",
        !showImage && accent,
        showImage && "bg-muted",
        className,
      )}
      title={label}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth > 0 && img.naturalWidth < 20) {
              setFailed(true)
            }
          }}
        />
      ) : isPerson || resolvedCategory ? (
        <Icon className="size-4" aria-hidden />
      ) : (
        <span>{merchantInitials(label)}</span>
      )}
    </div>
  )
})
