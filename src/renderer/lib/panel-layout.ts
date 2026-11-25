export const panelSeparatorClassName =
  'relative touch-none [-webkit-app-region:no-drag] after:pointer-events-none after:absolute after:inset-y-0 after:start-1/2 after:w-[3px] after:-translate-x-1/2 after:rounded-full after:bg-linear-to-b after:from-transparent after:via-accent/65 after:to-transparent after:opacity-0 after:transition-opacity data-[separator=hover]:after:opacity-100 data-[separator=active]:after:opacity-100 focus-visible:after:opacity-100 motion-reduce:after:transition-none';

export const panelCollapsePreviewClassName =
  '[[data-collapse-preview]>&]:blur-[3px] motion-safe:transition-[filter] motion-safe:duration-150';

export const panelAnimationTiming = { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' };

export const panelContentTiming = 'motion-safe:duration-[320ms] motion-safe:ease-[cubic-bezier(.22,1,.36,1)]';
