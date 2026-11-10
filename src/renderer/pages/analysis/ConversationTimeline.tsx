import { cx } from '@renderer/utils/cx';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@renderer/components/ui/index';
import { ArrowDownIcon } from '@phosphor-icons/react';

export default function ConversationTimeline({
  children,
  sessionKey,
  targetMessageId,
  className,
}: {
  children: ReactNode;
  sessionKey: string;
  targetMessageId?: string;
  className?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const anchor = useRef<string | undefined>(undefined);
  const [away, setAway] = useState(false);

  const latest = () => {
    anchor.current = undefined;
    follow.current = true;
    setAway(false);
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  };

  const alignTarget = () => {
    const target = Array.from(content.current?.children || []).find(
      (node) => node instanceof HTMLElement && node.dataset.messageId === anchor.current,
    );
    if (target && scroll.current)
      scroll.current.scrollTop +=
        target.getBoundingClientRect().top - scroll.current.getBoundingClientRect().top;
  };
  useEffect(() => {
    if (targetMessageId) {
      anchor.current = targetMessageId;
      follow.current = false;
      alignTarget();
    } else latest();
  }, [sessionKey, targetMessageId]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      // Keep a linked historical reply in view while earlier results load.
      if (anchor.current) {
        alignTarget();
        return;
      }
      if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    });
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="relative flex flex-col min-h-0 flex-1">
      <div
        className={cx(
          'conversation-body [overflow-anchor:none] flex-1 min-h-0 overflow-auto py-5 px-4 overscroll-contain',
          className,
        )}
        ref={scroll}
        onWheel={() => {
          anchor.current = undefined;
        }}
        onTouchMove={() => {
          anchor.current = undefined;
        }}
        onPointerDown={() => {
          anchor.current = undefined;
        }}
        onKeyDown={() => {
          anchor.current = undefined;
        }}
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
          className="absolute bottom-2.5 left-[50%] [transform:translateX(-50%)] z-2"
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
