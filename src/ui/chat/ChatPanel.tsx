import { FC } from 'react';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export const ChatPanel: FC<{ messages: ChatMessage[]; streaming?: boolean }>
  = ({ messages, streaming }) => {
  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className="msg">
          <div className="avatar">{m.role === 'user' ? 'U' : 'A'}</div>
          <div className="bubble">
            {m.content}
            {streaming && m === messages[messages.length - 1] && <Blink/>}
          </div>
        </div>
      ))}
      {messages.length === 0 && (
        <div className="muted">Start a conversation by asking a question.</div>
      )}
    </div>
  );
};

function Blink() {
  return <span style={{opacity:.6}}>|</span>;
}

