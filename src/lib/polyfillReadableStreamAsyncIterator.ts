// pdfjs-dist's own code (both the main-thread half and the worker-thread half of its
// MessageHandler — these are two separate globals, each needs this independently) expects
// ReadableStream to support the async iterator protocol (`for await (const chunk of stream)`,
// which desugars to a call to `stream.values()` / `stream[Symbol.asyncIterator]()`). That
// protocol was added to the Streams spec after ReadableStream itself, and some current Safari
// builds still don't implement it — throwing "undefined is not a function (near '...value of
// readableStream...')" the moment pdf.js tries to use it, even though ReadableStream otherwise
// works fine there. Call this once in every global scope pdf.js code runs in, before any pdf.js
// call — it's a no-op wherever the method already exists (every non-Safari browser).
export function polyfillReadableStreamAsyncIterator(): void {
  if (typeof ReadableStream === 'undefined') return;
  const proto = ReadableStream.prototype as unknown as Record<PropertyKey, unknown>;
  if (proto.values) return;

  interface ReadableStreamAsyncIterator {
    next: () => Promise<ReadableStreamReadResult<unknown>>;
    return: (value: unknown) => Promise<{ done: true; value: unknown }>;
    [Symbol.asyncIterator]: () => ReadableStreamAsyncIterator;
  }

  function readableStreamValues(
    this: ReadableStream,
    { preventCancel = false }: { preventCancel?: boolean } = {}
  ): ReadableStreamAsyncIterator {
    const reader = this.getReader();
    const iterator: ReadableStreamAsyncIterator = {
      next: () => reader.read(),
      return: (value: unknown) => {
        if (!preventCancel) {
          const cancelPromise = reader.cancel(value);
          reader.releaseLock();
          return cancelPromise.then(() => ({ done: true as const, value }));
        }
        reader.releaseLock();
        return Promise.resolve({ done: true as const, value });
      },
      [Symbol.asyncIterator]: () => iterator,
    };
    return iterator;
  }

  proto.values = readableStreamValues;
  if (!proto[Symbol.asyncIterator]) {
    proto[Symbol.asyncIterator] = readableStreamValues;
  }
}
