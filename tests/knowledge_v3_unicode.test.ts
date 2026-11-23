import { describe, expect, it } from 'vitest';
import { normalizeForEmbedding, validateUnicodeScalarText } from '../packages/intelligence/src/knowledge/v3/unicode';
describe('embedding Unicode boundary',()=>{
 it('detects unsafe scalar/control content without changing source text',()=>{const s='A\u0001\u2019\u200B';const d=validateUnicodeScalarText(s);expect(d.valid).toBe(true);expect(d.codePointCounts['C0_U+0001']).toBe(1);expect(d.codePointCounts.zero_width).toBe(1);expect(s).toBe('A\u0001\u2019\u200B');});
 it('replaces lone surrogates deterministically',()=>{const s='x\uD800y';expect(validateUnicodeScalarText(s).valid).toBe(false);expect(normalizeForEmbedding(s)).toBe('x�y');});
 it('preserves meaningful Unicode while normalizing transport hazards',()=>{expect(normalizeForEmbedding('Arabic العربية\r\nsmart\u2019 quote')).toContain('العربية');expect(normalizeForEmbedding('a\u0000b')).toBe('ab');});
});
