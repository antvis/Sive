import type { Progress } from './contracts';

// Historical model diagnostics are excluded from copied replies and exports.
export const isAnalysisEvent = (event: Progress) =>
  !['modelstart', 'modelend', 'capabilitystart', 'capabilityend'].includes(event.stage);
