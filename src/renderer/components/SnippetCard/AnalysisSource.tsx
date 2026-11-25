import { ChevronDownIcon, LinkIcon } from 'lucide-react';
import { useState } from 'react';
import type { SnippetContent } from '@shared/schema';
import { AnalysisTraceView } from '../chat/tools/analysis-trace-view';

export function AnalysisSource({ question, trace }: Pick<SnippetContent, 'question' | 'trace'>) {
  const [open, setOpen] = useState(false);

  return (
    <details className="group/source min-w-0 flex-1" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm leading-6 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <LinkIcon size={13} aria-hidden />
        分析来源
        <ChevronDownIcon size={11} aria-hidden className="group-open/source:rotate-180" />
      </summary>
      <p className="mt-2 mb-0 text-sm leading-5 text-pretty wrap-anywhere">{question}</p>
      {open && trace ? (
        <div className="mt-3 [--analysis-view-max-height:min(24rem,50dvh)]">
          <AnalysisTraceView trace={trace} />
        </div>
      ) : null}
    </details>
  );
}
