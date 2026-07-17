import { useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowUpIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Marker } from "@/components/ui/marker"
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFinanceData } from "@/hooks/use-finance-data"
import { buildFinanceContext } from "@/lib/finance-context"
import { chatWithFinance, type ChatMessage } from "@/server/chat"
import { cn } from "@/lib/utils"

type UiMessage = ChatMessage & { id: string }

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
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  const canChat = transactionCount > 0

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setBusy(true)

    try {
      const transactions = getTransactionsSnapshot()
      if (transactions.length === 0) {
        throw new Error("Import a bank CSV first so I can answer with your data.")
      }
      const financeContext = buildFinanceContext(transactions)
      const { reply } = await chatWithFinance({
        data: {
          messages: next.map(({ role, content }) => ({ role, content })),
          financeContext,
        },
      })
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: reply },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(msg)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry — I couldn't answer that. ${msg}`,
        },
      ])
    } finally {
      setBusy(false)
    }
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
              <SheetTitle className="flex items-center gap-2">
                <SparklesIcon className="size-4" />
                RupeeLens AI
              </SheetTitle>
              <SheetDescription>
                Ask about spends, categories, and subscriptions from your
                imported statements.
              </SheetDescription>
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

        <MessageScrollerProvider autoScroll>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              {empty ? (
                <Empty className="h-full border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SparklesIcon />
                    </EmptyMedia>
                    <EmptyTitle>Ask your money anything</EmptyTitle>
                    <EmptyDescription>
                      {canChat
                        ? `${transactionCount} transactions loaded. Try a prompt below.`
                        : "Upload a bank CSV first, then come back to chat."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <div className="mt-4 flex max-w-sm flex-col gap-2 px-6">
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
                </Empty>
              ) : (
                <MessageScroller>
                  <MessageScrollerViewport>
                    <MessageScrollerContent
                      aria-busy={busy}
                      className="gap-4 p-4"
                    >
                      {messages.map((message) => (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          scrollAnchor={message.role === "user"}
                        >
                          <Message
                            align={message.role === "user" ? "end" : "start"}
                          >
                            <MessageContent>
                              <MessageHeader>
                                {message.role === "user" ? "You" : "RupeeLens AI"}
                              </MessageHeader>
                              <Bubble
                                variant={
                                  message.role === "user" ? "default" : "muted"
                                }
                                align={
                                  message.role === "user" ? "end" : "start"
                                }
                              >
                                <BubbleContent className="whitespace-pre-wrap">
                                  {message.content}
                                </BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      ))}
                      {busy ? (
                        <MessageScrollerItem messageId="thinking">
                          <Marker className="shimmer px-1">
                            Thinking with your ledger…
                          </Marker>
                        </MessageScrollerItem>
                      ) : null}
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  <MessageScrollerButton />
                </MessageScroller>
              )}
            </div>

            <div className="border-t p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(input)
                }}
              >
                <InputGroup>
                  <InputGroupTextarea
                    placeholder={
                      canChat
                        ? "Ask about your spending…"
                        : "Import a CSV to enable chat"
                    }
                    value={input}
                    disabled={!canChat || busy}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void send(input)
                      }
                    }}
                    className="min-h-16"
                  />
                  <InputGroupAddon align="block-end">
                    <InputGroupButton
                      type="submit"
                      variant="default"
                      size="icon-sm"
                      className="ml-auto"
                      disabled={!canChat || busy || !input.trim()}
                      aria-label="Send"
                    >
                      {busy ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <ArrowUpIcon />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>
              <p className="text-muted-foreground mt-2 text-[11px]">
                Context stays in your browser; only summaries are sent to Mistral.
              </p>
            </div>
          </div>
        </MessageScrollerProvider>
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
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6", className)}
    >
      <Button
        size="lg"
        className="rounded-full shadow-lg"
        onClick={onClick}
      >
        <SparklesIcon className="size-4" />
        Ask AI
      </Button>
    </motion.div>
  )
}
