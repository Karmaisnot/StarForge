import { describe, expect, it } from 'vitest';
import en from './en.js';
import ru from './ru.js';
import uz from './uz.js';

function leafKeys(value, prefix = '', keys = []) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      leafKeys(child, path, keys);
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe('locale dictionaries', () => {
  it('keep English, Russian and Uzbek translation keys in sync', () => {
    const expected = leafKeys(en).sort();
    expect(leafKeys(ru).sort()).toEqual(expected);
    expect(leafKeys(uz).sort()).toEqual(expected);
  });
});
