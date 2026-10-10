import { useId, useState } from 'react';
import { useSupportInbox } from './support-client.js';
import { useSupportData } from './support-data.js';
/** @param {{request:import('./support-client.js').SupportClient,active?:boolean,data?:import('./support-client.js').SupportDataAdapter}} props */
export function WebSupport({ request, active = true, data }) {
  const chat = useSupportInbox(request, active);
  const titleId = useId(),
    messageId = useId(),
    previewId = useId();
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const c = chat.conversation;
  const logs = useSupportData(c, data, () => crypto.randomUUID(), chat.mutate);
  const disabled = chat.busy || logs.busy;
  return (
    <section className="mx-4 flex max-w-3xl flex-col gap-4 lg:mx-6" aria-label="Support inbox">
      <h2 className="text-2xl font-semibold">Support</h2>
      {chat.error && <p role="alert">{chat.error}</p>}
      {logs.error && <p role="alert">{logs.error}</p>}
      <button type="button" disabled={disabled} onClick={() => void chat.refresh()}>
        Refresh
      </button>
      {!c ? (
        <>
          <p>Ask Isobot a question or report a problem. Staff can join the conversation.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void chat.create(crypto.randomUUID(), title).then((saved) => {
                if (saved) {
                  setTitle('');
                  setDraft('');
                }
                return undefined;
              });
            }}
          >
            <label htmlFor={titleId}>Conversation title</label>
            <input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
              className="w-full rounded-lg border bg-background p-3"
            />
            <button disabled={disabled} type="submit">
              New conversation
            </button>
          </form>
          {chat.conversations.map((item) => (
            <button
              key={item.id}
              disabled={disabled}
              type="button"
              className="rounded-lg border p-4 text-left"
              onClick={() => {
                setDraft('');
                void chat.open(item.id);
              }}
            >
              {item.title} · {item.status}
              {item.unreadCount ? ` · ${item.unreadCount} unread` : ''}
            </button>
          ))}
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              logs.cancel();
              setDraft('');
              void chat.open('');
            }}
          >
            Back to conversations
          </button>
          <h3 className="text-lg font-semibold">
            {c.title} · {c.status}
          </h3>
          {c.hasMore && (
            <button disabled={disabled} type="button" onClick={() => void chat.loadOlder()}>
              Load earlier messages
            </button>
          )}
          <div
            role="log"
            aria-label="Support messages"
            className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto"
          >
            {c.messages.map((message) => (
              <article key={message.id} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  {message.author === 'pi'
                    ? 'Isobot'
                    : message.author === 'staff'
                      ? 'Support'
                      : 'You'}{' '}
                  · {new Date(message.createdAt).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
              </article>
            ))}
          </div>
          <button
            disabled={disabled}
            type="button"
            onClick={() =>
              void chat.mutate('readCursor', { readThrough: c.messages.at(-1)?.sequence ?? 0 })
            }
          >
            Mark as read
          </button>
          {c.requests.map((r) => (
            <article key={r.id} className="rounded-lg border p-4" aria-label="Data request">
              <p>{r.reason}</p>
              <p>
                {r.selector.category} · {new Date(r.selector.from).toLocaleString()} to{' '}
                {new Date(r.selector.to).toLocaleString()} · {r.status}
              </p>
              {r.status === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={disabled || !data}
                    onClick={() => void logs.prepare(r)}
                  >
                    Review requested data
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void chat.mutate('decline', { requestId: r.id })}
                  >
                    Decline
                  </button>
                </>
              )}
            </article>
          ))}
          {c.attachments.map((a) => (
            <p key={a.id}>
              {a.category} attachment · {a.removed ? 'Removed when archived' : 'Shared'}
            </p>
          ))}
          {logs.preview && (
            <div className="rounded-lg border p-4">
              <p>
                Review this snapshot. Remove any entries you do not want to share. Accepted data
                will be processed by Isobot and its model provider.
              </p>
              <label htmlFor={previewId}>Data preview</label>
              <textarea
                id={previewId}
                value={logs.preview.content}
                maxLength={128000}
                rows={12}
                disabled={disabled}
                onChange={(event) => logs.edit(event.target.value)}
                className="w-full rounded-lg border bg-background p-3 font-mono text-sm"
              />
              <button disabled={disabled} type="button" onClick={() => void logs.share()}>
                Accept and share this snapshot
              </button>
              <button disabled={disabled} type="button" onClick={logs.cancel}>
                Cancel
              </button>
            </div>
          )}
          {c.status === 'open' ? (
            <>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = draft.trim();
                  if (value)
                    void chat.send(value, crypto.randomUUID()).then((saved) => {
                      if (saved) setDraft('');
                      return undefined;
                    });
                }}
              >
                <label htmlFor={messageId}>Your message</label>
                <textarea
                  id={messageId}
                  value={draft}
                  maxLength={1800}
                  rows={3}
                  required
                  disabled={disabled}
                  onChange={(event) => setDraft(event.target.value)}
                  className="w-full rounded-lg border bg-background p-3"
                />
                <button type="submit" disabled={disabled}>
                  Send
                </button>
              </form>
              {data && (
                <button type="button" disabled={disabled} onClick={() => void logs.prepare(null)}>
                  Attach recent logs
                </button>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={c.agentAccess}
                  disabled={disabled}
                  onChange={(event) =>
                    void chat.mutate('update', { agentAccess: event.target.checked })
                  }
                />{' '}
                Allow connected agents to access this conversation
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={c.autoReply}
                  disabled={disabled}
                  onChange={(event) =>
                    void chat.mutate('update', { autoReply: event.target.checked })
                  }
                />{' '}
                Isobot replies automatically
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void chat.mutate('update', { status: 'resolved' })}
              >
                Resolve conversation
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void chat.mutate('update', { status: 'open' })}
            >
              Reopen conversation
            </button>
          )}
          {c.status !== 'archived' && (
            <button
              disabled={disabled}
              type="button"
              onClick={() => {
                if (
                  window.confirm('Archive this conversation? Text stays; attachments are deleted.')
                )
                  void chat.mutate('archive');
              }}
            >
              Archive conversation
            </button>
          )}
          <button
            disabled={disabled}
            type="button"
            onClick={() => {
              if (window.confirm('Delete this conversation and its attachments permanently?'))
                void chat.mutate('delete');
            }}
          >
            Delete conversation
          </button>
          {c.jobs?.map((job) => (
            <p key={job.id}>
              Implementation task · {job.status}
              {job.result ? ` · ${job.result}` : ''}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
