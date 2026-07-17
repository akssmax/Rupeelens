export function getMistralApiKey(): string {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    throw new Error(
      "MISTRAL_API_KEY is not set. Add it to your .env file and restart the dev server.",
    )
  }
  return apiKey
}

export async function mistralChat(params: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  model?: string
  temperature?: number
  json?: boolean
}): Promise<string> {
  const apiKey = getMistralApiKey()
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model || "mistral-small-latest",
      temperature: params.temperature ?? 0.2,
      ...(params.json ? { response_format: { type: "json_object" } } : {}),
      messages: params.messages,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Mistral API error (${response.status}): ${errText}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("Empty response from Mistral")
  return content
}
