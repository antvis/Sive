import { cx } from '@renderer/utils/cx';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@renderer/components/ui/index';
import { ArrowDownIcon } from '@phosphor-icons/react';

export default function ConversationTimeline({
  children,
  sessionKey,
  targetMessageId,
  scrollRequest,
  className,
}: {
  children: ReactNode;
  sessionKey: string;
  targetMessageId?: string;
  scrollRequest: number;
  className?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const animating = useRef(false);
  const anchor = useRef<string | undefined>(undefined);
  const [away, setAway] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const node = scroll.current;
    if (!node) return;
    animating.current = behavior === 'smooth' && node.scrollHeight - node.scrollTop - node.clientHeight > 1;
    node.scrollTo({ top: node.scrollHeight, behavior });
  };

  const latest = (behavior: ScrollBehavior = 'smooth') => {
    anchor.current = undefined;
    follow.current = true;
    setAway(false);
    scrollToBottom(behavior);
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
      animating.current = false;
      alignTarget();
    } else latest('instant');
  }, [sessionKey, targetMessageId]);
  useLayoutEffect(() => {
    if (scrollRequest) latest();
  }, [scrollRequest]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      // Keep a linked historical reply in view while earlier results load.
      if (anchor.current) {
        alignTarget();
        return;
      }
      if (follow.current) scrollToBottom(animating.current ? 'smooth' : 'instant');
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
        onWheel={(event) => {
          anchor.current = undefined;
          animating.current = false;
          if (event.deltaY < 0) follow.current = false;
        }}
        onTouchMove={() => {
          anchor.current = undefined;
          animating.current = false;
        }}
        onPointerDown={() => {
          anchor.current = undefined;
          animating.current = false;
        }}
        onKeyDown={() => {
          anchor.current = undefined;
          animating.current = false;
        }}
        onScroll={(event) => {
          const node = event.currentTarget;
          const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
          if (animating.current && remaining > 1) return;
          animating.current = false;
          follow.current = remaining < 48;
          setAway(!follow.current);
        }}
      >
        <div
          ref={content}
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest('summary')) {
              // A disclosure changes height for reading, not because a new reply arrived.
              follow.current = false;
              animating.current = false;
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
          onClick={() => latest()}
        >
          回到最新
        </Button>
      )}
    </div>
  );
}
