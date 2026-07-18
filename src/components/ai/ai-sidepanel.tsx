import { Fragment, useCallback, useEffect, useState } from "react"
import {
  CopyIcon,
  RefreshCcwIcon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Marker } from "@/components/ui/marker"
import { CategorizationConfirmCard } from "@/components/ai/categorization-confirm-card"
import { useFinanceData } from "@/hooks/use-finance-data"
import {
  formatPreviewSummary,
  looksLikeCategorizationRequest,
  previewCategorizationActions,
  type CategorizationPreview,
} from "@/lib/chat-categorize"
import {
  buildFinanceContext,
  buildUncategorizedMerchantsContext,
} from "@/lib/finance-context"
import { chatWithFinance, type ChatMessage } from "@/server/chat"
import { parseChatCategorization } from "@/server/chat-categorize"
import { cn } from "@/lib/utils"

type UiMessage = ChatMessage & {
  id: string
  categorization?: {
    previews: CategorizationPreview[]
    status: "pending" | "confirmed" | "cancelled"
  }
}
type Feedback = "up" | "down"

const SUGGESTION_POOL = [
  "Where did I spend the most this month?",
  "What are my top five merchants by spend?",
  "List my subscriptions and total monthly cost",
  "How much did I spend on food delivery?",
  "Compare this month's spending to last month",
  "Which categories increased the most recently?",
  "Summarize my rent and utility payments",
  "What's my net income minus expenses this month?",
  "Show my largest single debit this month",
  "How much went to investments or gold buys?",
  "Any recurring charges I should review?",
  "Break down my weekend vs weekday spending",
  "Which uncategorized transactions need attention?",
  "Bistro belongs to food — update uncategorized transactions",
  "How much did I spend on UPI person-to-person transfers?",
  "What did I spend on travel and commute?",
]

function pickRandomSuggestions(count: number): string[] {
  const pool = [...SUGGESTION_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function AiSidepanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    transactionCount,
    getTransactionsSnapshot,
    categories,
    applyMerchantCategorizations,
  } = useFinanceData()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [feedback, setFeedback] = useState<Record<string, Feedback | undefined>>(
    {},
  )
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState(() =>
    pickRandomSuggestions(4),
  )

  const canChat = transactionCount > 0

  useEffect(() => {
    if (open && messages.length === 0) {
      setSuggestions(pickRandomSuggestions(4))
    }
  }, [open, messages.length])

  const send = useCallback(
    async (
      text: string,
      options?: { appendUser?: boolean; baseMessages?: UiMessage[] },
    ) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return

      const appendUser = options?.appendUser ?? true
      const base = options?.baseMessages ?? messages

      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      }
      const next = appendUser ? [...base, userMsg] : base

      if (appendUser) {
        setMessages(next)
      }

      setBusy(true)

      try {
        const transactions = getTransactionsSnapshot()
        if (transactions.length === 0) {
          throw new Error(
            "Import a bank CSV first so I can answer with your data.",
          )
        }

        if (looksLikeCategorizationRequest(trimmed)) {
          const uncategorizedContext = buildUncategorizedMerchantsContext(
            transactions,
            categories,
          )
          const categoryIds = categories.map((category) => category.id)
          const parsed = await parseChatCategorization({
            data: {
              message: trimmed,
              recentMessages: next.map(({ role, content }) => ({
                role,
                content,
              })),
              uncategorizedContext,
              categoryIds,
            },
          })

          if (parsed.intent === "categorize" && parsed.actions.length > 0) {
            const previews = previewCategorizationActions(
              transactions,
              parsed.actions,
            )
            const hasMatches = previews.some(
              (preview) => preview.matched.length > 0,
            )
            const summary = formatPreviewSummary(previews)
            const reply = hasMatches
              ? `${parsed.reply}\n\n${summary}\n\nConfirm below to update uncategorized transactions.`
              : parsed.reply

            setMessages((prev) => [
              ...(appendUser ? prev : base),
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: reply,
                categorization: hasMatches
                  ? { previews, status: "pending" }
                  : undefined,
              },
            ])
            return
          }

          if (parsed.intent === "none" && parsed.reply) {
            setMessages((prev) => [
              ...(appendUser ? prev : base),
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: parsed.reply,
              },
            ])
            return
          }
        }

        const financeContext = buildFinanceContext(transactions)
        const { reply } = await chatWithFinance({
          data: {
            messages: next.map(({ role, content }) => ({ role, content })),
            financeContext,
          },
        })
        setMessages((prev) => [
          ...(appendUser ? prev : base),
          { id: crypto.randomUUID(), role: "assistant", content: reply },
        ])
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        toast.error(msg)
        setMessages((prev) => [
          ...(appendUser ? prev : base),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry — I couldn't answer that. ${msg}`,
          },
        ])
      } finally {
        setBusy(false)
      }
    },
    [busy, categories, getTransactionsSnapshot, messages],
  )

  const handleConfirmCategorization = useCallback(
    async (messageId: string, previews: CategorizationPreview[]) => {
      setBusy(true)
      try {
        const result = await applyMerchantCategorizations(previews)
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId && message.categorization
              ? {
                  ...message,
                  categorization: {
                    ...message.categorization,
                    status: "confirmed",
                  },
                }
              : message,
          ),
        )

        const summary =
          result.merchants.length > 0
            ? result.merchants
                .map(
                  (item) =>
                    `Updated ${item.count} ${item.merchantQuery} transaction${item.count === 1 ? "" : "s"} to ${item.categoryName}.`,
                )
                .join(" ")
            : "No transactions were updated."

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: summary,
          },
        ])
        toast.success(
          result.updated > 0
            ? `Updated ${result.updated} transaction${result.updated === 1 ? "" : "s"}`
            : "No transactions updated",
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        toast.error(msg)
      } finally {
        setBusy(false)
      }
    },
    [applyMerchantCategorizations],
  )

  const handleCancelCategorization = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId && message.categorization
          ? {
              ...message,
              categorization: {
                ...message.categorization,
                status: "cancelled",
              },
            }
          : message,
      ),
    )
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Category update cancelled.",
      },
    ])
  }, [])

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim()) {
      void send(message.text)
    }
  }

  const handleRegenerate = async (messageIndex: number) => {
    const prior = messages.slice(0, messageIndex)
    const lastUser = [...prior].reverse().find((m) => m.role === "user")
    if (!lastUser) return
    setMessages(prior)
    await send(lastUser.content, { appendUser: false, baseMessages: prior })
  }

  const setMessageFeedback = (messageId: string, value: Feedback) => {
    setFeedback((prev) => {
      const next = prev[messageId] === value ? undefined : value
      return { ...prev, [messageId]: next }
    })
    toast.success("Thanks for the feedback")
  }

  const empty = messages.length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <SheetHeader className="border-b px-4 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="flex items-center gap-2.5">
                <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <SparklesIcon className="size-4" />
                </span>
                RupeeLens AI
              </SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <XIcon />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {empty ? (
            <ConversationEmptyState
              className="flex-1"
              title="What would you like to know?"
              description={
                canChat
                  ? `${transactionCount.toLocaleString()} transactions in context — pick a starter or ask your own.`
                  : "Import a bank statement first, then ask about your spends."
              }
              icon={
                <span className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
                  <SparklesIcon className="size-5" />
                </span>
              }
            >
              {canChat ? (
                <div className="mt-5 w-full max-w-sm space-y-2 text-left">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Suggested for you
                  </p>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        className="hover:bg-muted/60 h-auto justify-start whitespace-normal px-3 py-2.5 text-left text-xs leading-snug"
                        disabled={busy}
                        onClick={() => void send(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </ConversationEmptyState>
          ) : (
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="gap-6 p-4">
                {messages.map((message, index) => {
                  const isAssistant = message.role === "assistant"
                  const isLastAssistant =
                    isAssistant &&
                    !messages.slice(index + 1).some((m) => m.role === "assistant")

                  return (
                    <Fragment key={message.id}>
                      <Message from={message.role}>
                        <MessageContent>
                          {isAssistant ? (
                            <>
                              <MessageResponse>{message.content}</MessageResponse>
                              {message.categorization ? (
                                <CategorizationConfirmCard
                                  previews={message.categorization.previews}
                                  status={message.categorization.status}
                                  busy={busy}
                                  onConfirm={() =>
                                    void handleConfirmCategorization(
                                      message.id,
                                      message.categorization!.previews,
                                    )
                                  }
                                  onCancel={() =>
                                    handleCancelCategorization(message.id)
                                  }
                                />
                              ) : null}
                            </>
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                        </MessageContent>
                      </Message>

                      {isAssistant ? (
                        <MessageActions className="ml-0.5">
                          <MessageAction
                            tooltip="Good response"
                            label="Good response"
                            variant={
                              feedback[message.id] === "up"
                                ? "secondary"
                                : "ghost"
                            }
                            onClick={() =>
                              setMessageFeedback(message.id, "up")
                            }
                          >
                            <ThumbsUpIcon className="size-3.5" />
                          </MessageAction>
                          <MessageAction
                            tooltip="Bad response"
                            label="Bad response"
                            variant={
                              feedback[message.id] === "down"
                                ? "secondary"
                                : "ghost"
                            }
                            onClick={() =>
                              setMessageFeedback(message.id, "down")
                            }
                          >
                            <ThumbsDownIcon className="size-3.5" />
                          </MessageAction>
                          <MessageAction
                            tooltip="Copy"
                            label="Copy"
                            onClick={() => {
                              void navigator.clipboard.writeText(message.content)
                              toast.success("Copied to clipboard")
                            }}
                          >
                            <CopyIcon className="size-3.5" />
                          </MessageAction>
                          {isLastAssistant ? (
                            <MessageAction
                              tooltip="Regenerate"
                              label="Regenerate"
                              disabled={busy}
                              onClick={() => void handleRegenerate(index)}
                            >
                              <RefreshCcwIcon className="size-3.5" />
                            </MessageAction>
                          ) : null}
                        </MessageActions>
                      ) : null}
                    </Fragment>
                  )
                })}
                {busy ? (
                  <Marker className="shimmer px-1">
                    Thinking with your ledger…
                  </Marker>
                ) : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          )}

          <div className="border-t p-3">
            <PromptInput
              onSubmit={(message, event) => {
                event.preventDefault()
                handleSubmit(message)
              }}
              className="w-full"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder={
                    canChat
                      ? "Ask about your spending…"
                      : "Import a CSV to enable chat"
                  }
                  disabled={!canChat || busy}
                />
              </PromptInputBody>
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  status={busy ? "submitted" : undefined}
                  disabled={!canChat || busy}
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="text-muted-foreground mt-2 text-[11px]">
              Context stays in your browser; only summaries are sent to Mistral.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function AiFab({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6",
        className,
      )}
    >
      <Button size="lg" className="rounded-full shadow-lg" onClick={onClick}>
        <SparklesIcon className="size-4" />
        Ask AI
      </Button>
    </div>
  )
}
