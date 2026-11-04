import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './ui';
import { ArrowDownIcon } from '@phosphor-icons/react';

export default function ConversationTimeline({
  children,
  sessionKey,
}: {
  children: ReactNode;
  sessionKey: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [away, setAway] = useState(false);
  const latest = () => {
    follow.current = true;
    setAway(false);
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  };
  useEffect(() => {
    latest();
  }, [sessionKey]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const active = document.activeElement;
      if (
        active &&
        content.current?.contains(active) &&
        active.matches('textarea, input, [contenteditable="true"]')
      )
        return;
      if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    });
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="conversation-feed">
      <div
        className="conversation-body"
        ref={scroll}
        onScroll={(event) => {
          const node = event.currentTarget;
          follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
          setAway(!follow.current);
        }}
      >
        <div
          ref={content}
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest('summary')) {
              // A disclosure changes height for reading, not because a new reply arrived.
              follow.current = false;
              setAway(true);
            }
          }}
        >
          {children}
        </div>
      </div>
      {away && (
        <Button
          className="conversation-latest"
          size="small"
          aria-label="回到最新"
          icon={<ArrowDownIcon />}
          onClick={latest}
        >
          回到最新
        </Button>
      )}
    </div>
  );
}
