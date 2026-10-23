'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClientProfile } from '@/lib/schemas';
import type { IntakeMessage } from '@/agents/intake';
import { EthosMark } from './EthosMark';
import { profileLines, profileToText } from './ProfileSummary';
import { friendly, getSession } from './api';

const GREETING =
  "Hi, I'm Ethos. I'll help you work out where an ethical portfolio should invest. To start: who is the money for, and roughly how long can it stay invested?";

const STARTERS = [
  'A charity fund that has to last decades',
  "A law firm's client or trust account",
  "A foundation's endowment",
  "My own savings, I'd need them in about 5 years",
];

const NUDGE = "Tell me what you'd like to change and I'll update your profile.";

const chatKey = (id: string) => `eia-chat-${id}`;
const textMessage = (id: string, text: string): IntakeMessage => ({ id, role: 'assistant', parts: [{ type: 'text', text }] });
const lastText = (m?: IntakeMessage) => m?.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('') ?? '';

/** Saved chat history for this session, so the interview survives reloads and later edits. */
function loadHistory(id: string): IntakeMessage[] | null {
  try {
    const raw = localStorage.getItem(chatKey(id));
    const parsed = raw ? (JSON.parse(raw) as IntakeMessage[]) : null;
    return parsed?.length ? parsed : null;
  } catch {
    return null;
  }
}

function startingMessages(id: string, profile?: ClientProfile): IntakeMessage[] {
  const history = loadHistory(id);
  if (!history) {
    return [
      profile
        ? textMessage('greeting', `Here is your current profile:\n${profileToText(profile)}\n\n${NUDGE}`)
        : textMessage('greeting', GREETING),
    ];
  }
  // Reopened after the profile was saved: invite changes, once.
  return profile && lastText(history.at(-1)) !== NUDGE ? [...history, textMessage(`nudge-${history.length}`, NUDGE)] : history;
}

/**
 * Interview chat. Pass the saved `profile` to reopen it for edits. Calls onDone once the agent has
 * saved a new profile (the server clears the old results at that point, so the screen result is gone).
 */
export function IntakeStep({
  sessionId,
  profile,
  onDone,
  onCancel,
}: {
  sessionId: string;
  profile?: ClientProfile;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<IntakeMessage>({
        api: '/api/intake',
        prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, messages } }),
      }),
    [],
  );
  const [initial] = useState(() => startingMessages(sessionId, profile));
  const { messages, sendMessage, status, error } = useChat<IntakeMessage>({
    id: sessionId,
    transport,
    messages: initial,
  });
  // The latest "what I understood" list from the AI. When reopening an edit, start from the saved profile.
  const understood =
    messages
      .slice()
      .reverse()
      .flatMap((m) => m.parts.flatMap((p) => (p.type === 'data-understood' ? [p.data] : [])))[0] ??
    (profile ? profileLines(profile) : []);
  const [input, setInput] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const [saved, setSaved] = useState(false);
  const turned = useRef(false);
  const [exchanged, setExchanged] = useState(false);

  useEffect(() => {
    try {
      if (status === 'ready') localStorage.setItem(chatKey(sessionId), JSON.stringify(messages));
    } catch {
      // storage blocked: the chat still works, it just won't be remembered
    }
  }, [messages, status, sessionId]);

  // After each finished turn, check whether the agent saved the profile.
  useEffect(() => {
    if (status !== 'ready' || !turned.current || saved) return;
    getSession(sessionId)
      .then((s) => {
        if (s.profile && !s.screen) {
          setSaved(true);
          onDone();
        }
      })
      .catch(() => undefined);
  }, [status, messages.length, saved, sessionId, onDone]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const busy = status === 'submitted' || status === 'streaming';
  const send = (text: string) => {
    if (!text.trim() || busy || saved) return;
    turned.current = true;
    setExchanged(true);
    sendMessage({ text });
    setInput('');
  };

  return (
    <section>
      <h2>{profile ? 'Change your preferences' : 'Chat with Ethos'}</h2>
      <p className="muted">
        Answer a few questions. Ethos asks follow-ups about your goals, limits and ethical lines, then builds your profile.
      </p>
      <div className="intake-grid">
      <div className="chat card">
        <div className="chatlog" aria-live="polite">
          {messages.map((m) => {
            const text = m.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('');
            if (!text) return null;
            return (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="bubble">
                  {m.role === 'assistant' && (
                    <span className="who">
                      <EthosMark size={18} /> Ethos
                    </span>
                  )}
                  {text}
                </div>
              </div>
            );
          })}
          {status === 'submitted' && (
            <div className="msg assistant">
              <div className="bubble muted">Ethos is thinking…</div>
            </div>
          )}
          {messages.length === 1 && !profile && (
            <div className="chips starters">
              {STARTERS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={end} />
        </div>
        {error && (
          <div className="error" role="alert">
            {friendly(error)}
          </div>
        )}
        <form
          className="chatform"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy || saved}
            placeholder={saved ? 'Profile saved' : 'Message Ethos…'}
            aria-label="Your answer"
          />
          <button className="btn" disabled={busy || saved || !input.trim()}>
            Send
          </button>
        </form>
      </div>
      <aside className="understood card soft" aria-live="polite">
        <h3>What Ethos has understood</h3>
        {understood.length === 0 ? (
          <p className="muted">Nothing yet. Answer the first question and this fills in as we talk.</p>
        ) : (
          <ul className="plain">
            {understood.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ margin: '.75rem 0 0', fontSize: '.8rem' }}>
          Tell Ethos in the chat if anything here is wrong.
        </p>
      </aside>
      </div>
      {onCancel && (
        <div className="actions">
          {exchanged && !saved && !busy && (
            <button className="btn" onClick={() => send('Yes, that is right. Please apply these changes now.')}>
              Apply these changes
            </button>
          )}
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            {exchanged && !saved ? 'Discard and go back' : 'Back to results'}
          </button>
          <small>
            {saved
              ? 'Saved. Your results are being recalculated.'
              : exchanged
                ? 'Your results only change once the changes are applied.'
                : 'Clear changes are applied straight away, then your results are recalculated.'}
          </small>
        </div>
      )}
    </section>
  );
}
