import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Font-size tokens must remain distinct from text color utilities when composing components.
const merge = extendTailwindMerge({
  override: { conflictingClassGroups: { 'font-size': [] } },
  extend: {
    theme: {
      text: [
        'tiny',
        'caption',
        'helper',
        'body',
        'label',
        'subtitle',
        'title',
        'section',
        'headline',
        'heading',
      ],
    },
  },
});
export const cx = (...values: ClassValue[]) => merge(clsx(values));
