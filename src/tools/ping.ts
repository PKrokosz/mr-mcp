import { z } from "zod";

export const pingInputSchema = z.object({
  message: z.string({
    required_error: "message is required"
  })
});

export const pingOutputSchema = z.object({
  echo: z.string(),
  ts: z.string().datetime()
});

export type PingInput = z.infer<typeof pingInputSchema>;
export type PingOutput = z.infer<typeof pingOutputSchema>;

export const pingJsonSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: {
      type: "string",
      description: "Tekst do odesłania przez serwer"
    }
  }
} as const;

export function pingTool(input: PingInput): PingOutput {
  const payload = pingInputSchema.parse(input);
  const response = {
    echo: payload.message,
    ts: new Date().toISOString()
  };
  return pingOutputSchema.parse(response);
}
