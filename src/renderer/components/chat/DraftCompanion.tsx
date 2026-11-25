import { cn } from '../../lib/utils';

const leftBubble = 'top-0 left-0 after:right-10';
const rightBubble = 'top-11 right-0 after:left-5';

const prompts = [
  {
    text: '最近有什么变化？',
    className: cn(leftBubble, 'motion-reduce:opacity-100'),
  },
  {
    text: '哪组差异最大？',
    className: cn(rightBubble, 'motion-safe:[animation-delay:1.2s] motion-reduce:opacity-100'),
  },
  {
    text: '有没有异常值？',
    className: cn(leftBubble, 'motion-safe:[animation-delay:6s]'),
  },
  {
    text: '画张图看看？',
    className: cn(rightBubble, 'motion-safe:[animation-delay:7.2s]'),
  },
];

export function DraftCompanion() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative flex w-56 max-w-full justify-center self-end pt-19 select-none"
    >
      <div className="motion-safe:animate-draft-companion-enter">
        <img
          src="./illustrations/draft-companion.png"
          alt=""
          width={288}
          height={259}
          decoding="async"
          className="h-[clamp(64px,11vh,96px)] w-auto origin-[50%_78%] object-contain drop-shadow-[0_9px_12px_#07589532] motion-safe:animate-draft-companion-idle"
        />
      </div>
      {prompts.map(({ text, className }) => (
        <p
          key={text}
          className={cn(
            'absolute z-10 rounded-xl bg-[light-dark(#f7faffed,#35485f)] px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[light-dark(#16436c,#e8f5ff)] opacity-0 shadow-[0_3px_12px_#213d621a] after:absolute after:top-full after:h-1 after:w-2 after:bg-inherit after:[clip-path:polygon(0_0,100%_0,50%_100%)] motion-safe:animate-draft-companion-bubble',
            className,
          )}
        >
          {text}
        </p>
      ))}
    </div>
  );
}
