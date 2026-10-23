import { convertToModelMessages, generateText, Output, type UIMessage } from 'ai';
import { z } from 'zod';
import { chatModel } from '@/lib/llm';
import { ACTIVITY_TAGS, CAUSES, SECTORS, clientProfileSchema } from '@/lib/schemas';
import { getSession, updateSession } from '@/lib/session';

const causeList = CAUSES.map((c) => `- ${c.id}: ${c.label} (${c.description})`).join('\n');

const INSTRUCTIONS = `You are Ethos, an AI adviser that helps ethical charities and ethical institutions (for example charities, foundations, trusts and law firms) invest in line with their values. Educational hackathon project, not financial advice or legal advice.
If the client is an institution, ask about the duties that limit it, such as a yearly spending rate or professional or regulatory rules, and why each holding must be explainable. Never give legal advice.
Interview the client to build their profile. Be warm and plain-spoken, no jargon without a one-line explanation.

Rules for the conversation:
- Ask ONE or TWO short questions per turn, never a long list. React to what they just said before asking the next thing.
- Cover, in roughly this order: who the money is for and the time horizon; how they would feel if the portfolio fell 20% in a year (this sets risk 1 to 5);
  sectors they want to avoid or favour; activities they refuse outright; the causes they care about and how strongly.
- Probe the ethical grey areas with concrete examples, e.g. "Would you accept a bank that lends to oil companies?" or
  "Is a defence firm that also makes medical equipment acceptable?". Ask whether a cause is a must-avoid or something to actively back.
- Point out trade-offs when relevant, e.g. excluding a whole sector narrows the choice and can raise risk.
- After about 5 to 8 exchanges, summarise the profile back in a few short bullets and ask the client to confirm or change anything.
- If a saved profile is given below, the client is revising it. When they state a clear change, apply it and return the full updated "profile" in that same turn, with a short reply saying what changed and that their results will be recalculated. Keep everything they did not mention exactly as saved. Only ask a question first if the change is ambiguous or conflicts with something else.
- Every turn, also return "understood": at most 8 short phrases in plain words listing what you know so far, e.g. "Money for: a cancer research charity", "Risk: moderate (3 of 5)", "Refuses: tobacco, weapons", "Backs: climate, strongly". Update it as the client changes their mind. Use an empty list before the client has told you anything.
- Every turn, answer with "reply" (your message to the client) and "profile". Keep "profile" null until the client has clearly confirmed your summary.
  On the confirming turn, fill "profile" completely and tell them in "reply" that the next step is the company screen.

Vocabularies you must map the client's words onto:
- risk 1 = very cautious ... 5 = very aggressive
- sectors: ${SECTORS.join(', ')}
- activity exclusions: ${ACTIVITY_TAGS.join(', ')}
- causes (use these ids):
${causeList}
- cause stance: "seek" (actively back) or "avoid" (just avoid serious offenders). Weight: 1 nice to have, 3 important, 5 non-negotiable.
Keep the client's own words for each cause in userWords. Leave sectors.include empty if they have no preference.`;

/** Chat message type shared with the UI: the reply text, plus what the AI has understood so far. */
export type IntakeMessage = UIMessage<unknown, { understood: string[] }>;

const turnSchema = z.object({
  reply: z.string(),
  /** Short plain-language facts gathered so far, shown beside the chat. */
  understood: z.array(z.string()),
  /** Null until the client confirms the summary; then the full profile. */
  profile: clientProfileSchema.nullable(),
});

/** The instructions, plus the saved profile when the client is revising one, so nothing they did not mention is lost. */
async function systemPrompt(sessionId: string): Promise<string> {
  const saved = (await getSession(sessionId))?.profile;
  return saved
    ? `${INSTRUCTIONS}\n\nSaved profile (JSON), the client is revising this:\n${JSON.stringify(saved)}`
    : INSTRUCTIONS;
}

/**
 * Agent (a): one interview turn. When the client has confirmed, writes session.profile and moves the
 * session to the screen stage. Returns the reply to show and what was understood.
 * ponytail: no function tools, the portal's chat endpoint rejects them for this deployment, so the profile
 * comes back as structured output instead. Switch to a ToolLoopAgent if the portal gains /responses.
 */
export async function runIntakeTurn(
  sessionId: string,
  messages: UIMessage[],
): Promise<{ reply: string; understood: string[] }> {
  const { output } = await generateText({
    model: chatModel(),
    system: await systemPrompt(sessionId),
    messages: await convertToModelMessages(messages),
    output: Output.object({ schema: turnSchema }),
    // Strict mode requires every field to be required; the profile has optional ones. zod still validates.
    providerOptions: { openai: { strictJsonSchema: false } },
  });
  if (output.profile) {
    // A new profile makes every downstream result stale, so clear them and restart from the screen stage.
    await updateSession(sessionId, {
      profile: output.profile,
      stage: 'screen',
      screen: undefined,
      screenApproval: undefined,
      vet: undefined,
      vetConfirmation: undefined,
      portfolio: undefined,
      report: undefined,
    });
  }
  return { reply: output.reply, understood: output.understood };
}
