import { Fragment, useCallback, useState } from "react"
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
import { useFinanceData } from "@/hooks/use-finance-data"
import { buildFinanceContext } from "@/lib/finance-context"
import { chatWithFinance, type ChatMessage } from "@/server/chat"
import { cn } from "@/lib/utils"

type UiMessage = ChatMessage & { id: string }
type Feedback = "up" | "down"

const SUGGESTIONS = [
  "Where did I spend the most this month?",
  "List my subscriptions and monthly cost",
  "How much did I spend on food delivery?",
  "Summarize my Safe Gold and investment spends",
]

export function AiSidepanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { transactionCount, getTransactionsSnapshot } = useFinanceData()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [feedback, setFeedback] = useState<Record<string, Feedback | undefined>>(
    {},
  )
  const [busy, setBusy] = useState(false)

  const canChat = transactionCount > 0

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
    [busy, getTransactionsSnapshot, messages],
  )

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
              title="Ask your money anything"
              description={
                canChat
                  ? `${transactionCount} transactions loaded. Try a prompt below.`
                  : "Upload a bank CSV first, then come back to chat."
              }
              icon={<SparklesIcon className="size-5" />}
            >
              <div className="mt-4 flex max-w-sm flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-xs"
                    disabled={!canChat || busy}
                    onClick={() => void send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
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
                            <MessageResponse>{message.content}</MessageResponse>
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
