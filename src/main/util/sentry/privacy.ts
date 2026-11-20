import type { ErrorEvent, EventHint } from '@sentry/electron/main';

const SAFE_ERROR_TYPE = /^[A-Za-z0-9_$.-]{1,100}$/;
const SAFE_FILENAME = /^(app:\/\/|webpack:\/\/|node:)/;

/**
 * This function sanitizes Sentry event envelopes to remove sensitive information before sending them to Sentry.
 * It removes user data, raw messages, and sensitive stack frame fields, while preserving native symbolication fields.
 */
export function sanitizeEventEnvelope(event: ErrorEvent, hint: EventHint) {
  const native = event.platform === 'native';
  if (!native) delete hint.attachments;

  event.message = event.exception?.values?.length ? undefined : 'Application diagnostic event';
  delete event.logentry;
  delete event.user;
  delete event.request;
  delete event.extra;
  delete event.breadcrumbs;

  for (const exception of event.exception?.values ?? []) {
    const type = exception.type ?? '';
    exception.type = SAFE_ERROR_TYPE.test(type) ? type : 'Error';
    exception.value = 'Application exception';
    delete exception.mechanism?.data;

    if (native) continue;
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.vars;
      delete frame.abs_path;
      delete frame.pre_context;
      delete frame.context_line;
      delete frame.post_context;
      if (frame.filename && !SAFE_FILENAME.test(frame.filename) && frame.filename !== '<anonymous>') {
        frame.filename = '<redacted>';
      }
    }
  }

  return event;
}
