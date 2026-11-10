import type { AnalysisOutput, AnalysisToolPart, Progress } from './contracts';

export function analysisTools(output?: AnalysisOutput): AnalysisToolPart[] {
  if (output?.tools) return output.tools;
  // Old records remain readable without rewriting saved analyses or snippets.
  return (output?.actions || []).map((action, index): AnalysisToolPart => {
    const toolCallId = `legacy:${index}`;
    const part: AnalysisToolPart =
      action.tool === 'analyze'
        ? {
            toolCallId,
            type: 'tool-analyze',
            state: 'input-available',
            input: { query: action.query, ...(action.resultId ? { resultId: action.resultId } : {}) },
          }
        : {
            toolCallId,
            type: 'tool-visualize',
            state: 'input-available',
            input: { query: action.query, resultId: action.resultId || '' },
          };
    // Legacy records did not store completion state; do not infer success.
    return action.error
      ? { ...part, state: 'output-error', errorText: action.error }
      : { ...part, title: '历史调用' };
  });
}

// Historical model diagnostics are excluded from copied replies and exports.
export const isAnalysisEvent = (event: Progress) =>
  !['modelstart', 'modelend', 'capabilitystart', 'capabilityend'].includes(event.stage);
