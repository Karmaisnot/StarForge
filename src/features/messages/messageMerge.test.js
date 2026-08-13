import { describe, expect, it } from 'vitest';
import { mergeTranscript } from './messageMerge.js';

describe('mergeTranscript', () => {
  it('keeps a confirmed local message visible until the refreshed transcript contains it', () => {
    const saved = { id: '92', text: 'Sent once' };
    expect(mergeTranscript([{ id: '91', text: 'Before' }], [saved])).toEqual([
      { id: '91', text: 'Before' },
      saved,
    ]);
    expect(mergeTranscript([{ id: '91' }, saved], [saved])).toEqual([{ id: '91' }, saved]);
  });
});
