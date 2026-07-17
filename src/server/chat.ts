import { createServerFn } from "@tanstack/react-start"
import { mistralChat } from "@/lib/mistral"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const SYSTEM = `You are RupeeLens AI — a helpful personal finance assistant for an Indian user.
You answer questions about their imported bank transactions using the finance context provided.
Be concise, specific, and use Indian Rupees (₹). Prefer concrete numbers from the context.
If data is missing, say so and suggest uploading a CSV or clarifying the month.
You can help with: spending breakdowns, subscriptions, category totals, unusual spends, savings tips grounded in their data.
Do not invent transactions. Do not ask for PAN, passwords, or OTPs.
Format answers with short paragraphs or bullet lists when helpful.`

export const chatWithFinance = createServerFn({ method: "POST" })
  .validator(
    (data: {
      messages: ChatMessage[]
      financeContext: string
      model?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const history = data.messages.slice(-16)
    const content = await mistralChat({
      model: data.model || "mistral-small-latest",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `${SYSTEM}\n\n--- FINANCE CONTEXT ---\n${data.financeContext}\n--- END CONTEXT ---`,
        },
        ...history,
      ],
    })
    return { reply: content.trim() }
  })
