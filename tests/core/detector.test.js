/**
 * Tests for the EmojiDetector class
 * Following test-driven development - tests first, implementation follows
 */

const { EmojiDetector } = require('../../src/core/detector');
const { TEST_DATA } = require('../../src/utils/patterns');

describe('EmojiDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new EmojiDetector();
  });

  describe('constructor', () => {
    test('should create detector with default config', () => {
      expect(detector).toBeInstanceOf(EmojiDetector);
      expect(detector.config).toBeDefined();
    });

    test('should accept custom config', () => {
      const config = { includeShortcodes: false };
      const customDetector = new EmojiDetector(config);
      expect(customDetector.config).toEqual(expect.objectContaining(config));
    });

    test('should merge custom config with defaults', () => {
      const config = { maxTextLength: 5000 };
      const customDetector = new EmojiDetector(config);
      expect(customDetector.config.includeShortcodes).toBe(true); // default
      expect(customDetector.config.maxTextLength).toBe(5000); // custom
    });
  });

  describe('findEmojis method', () => {
    test('should detect basic Unicode emojis', () => {
      const result = detector.findEmojis('Hello ✨ world');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        emoji: '✨',
        type: 'unicode',
        startIndex: 6,
        endIndex: 7,
        lineNumber: 1,
        columnStart: 7,
        columnEnd: 8
      });
    });

    test('should detect shortcode emojis when enabled', () => {
      const result = detector.findEmojis('Hello :rocket: world');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        emoji: ':rocket:',
        type: 'shortcode',
        startIndex: 6,
        endIndex: 14,
        lineNumber: 1,
        columnStart: 7,
        columnEnd: 15
      });
    });

    test('should not detect shortcode emojis when disabled', () => {
      const customDetector = new EmojiDetector({ includeShortcodes: false });
      const result = customDetector.findEmojis('Hello :rocket: world');
      expect(result).toHaveLength(0);
    });

    test('should detect emoji sequences with ZWJ', () => {
      const result = detector.findEmojis('Developer 👨‍💻 working');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        emoji: '👨‍💻',
        type: 'sequence',
        startIndex: 10,
        endIndex: 15,
        lineNumber: 1,
        columnStart: 11,
        columnEnd: 16
      });
    });

    test('should detect emojis with skin tone modifiers', () => {
      const result = detector.findEmojis('Wave 👋🏽 hello');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        emoji: '👋🏽',
        type: 'unicode',
        startIndex: 5,
        endIndex: 9,
        lineNumber: 1,
        columnStart: 6,
        columnEnd: 10
      });
    });

    test('should detect flag emojis', () => {
      const result = detector.findEmojis('Country 🇺🇸 flag');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        emoji: '🇺🇸',
        type: 'flag',
        startIndex: 8,
        endIndex: 12,
        lineNumber: 1,
        columnStart: 9,
        columnEnd: 13
      });
    });

    test('should detect keycap sequences', () => {
      const result = detector.findEmojis('Number 1️⃣ first');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        emoji: '1️⃣',
        type: 'keycap',
        startIndex: 7,
        endIndex: 10,
        lineNumber: 1,
        columnStart: 8,
        columnEnd: 11
      });
    });

    test('should detect tag sequences', () => {
      const result = detector.findEmojis('England 🏴󠁧󠁢󠁥󠁮󠁧󠁿 flag');
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
      expect(result[0].type).toBe('tag_sequence');
    });

    test('should detect multiple emojis in text', () => {
      const result = detector.findEmojis('Hello 👋 World 🌍 :rocket:');
      expect(result).toHaveLength(3);
      expect(result[0].emoji).toBe('👋');
      expect(result[1].emoji).toBe('🌍');
      expect(result[2].emoji).toBe(':rocket:');
    });

    test('should handle multiline text with line numbers', () => {
      const text = 'Line 1 ✨\nLine 2 🚀\nLine 3 :heart:';
      const result = detector.findEmojis(text);
      expect(result).toHaveLength(3);
      expect(result[0].lineNumber).toBe(1);
      expect(result[1].lineNumber).toBe(2);
      expect(result[2].lineNumber).toBe(3);
    });

    test('should pass specific line number when provided', () => {
      const result = detector.findEmojis('Hello ✨ world', 42);
      expect(result).toHaveLength(1);
      expect(result[0].lineNumber).toBe(42);
    });

    test('should handle empty strings', () => {
      const result = detector.findEmojis('');
      expect(result).toEqual([]);
    });

    test('should handle text with no emojis', () => {
      const result = detector.findEmojis('Just plain text here');
      expect(result).toEqual([]);
    });

    test('should handle adjacent emojis', () => {
      const result = detector.findEmojis('🚀🔥✨');
      expect(result).toHaveLength(3);
      expect(result[0].startIndex).toBe(0);
      expect(result[1].startIndex).toBe(2);
      expect(result[2].startIndex).toBe(4);
    });

    test('should handle mixed emoji types', () => {
      const result = detector.findEmojis('Unicode 🚀 shortcode :fire: sequence 👨‍💻');
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('unicode');
      expect(result[1].type).toBe('shortcode');
      expect(result[2].type).toBe('sequence');
    });

    test('should respect maxTextLength config', () => {
      const customDetector = new EmojiDetector({ maxTextLength: 5 });
      const longText = 'This is a very long text with emoji 🚀';
      expect(() => {
        customDetector.findEmojis(longText);
      }).toThrow('Text exceeds maximum length');
    });

    test('should handle null and undefined input gracefully', () => {
      expect(() => detector.findEmojis(null)).toThrow();
      expect(() => detector.findEmojis(undefined)).toThrow();
    });

    test('should handle non-string input gracefully', () => {
      expect(() => detector.findEmojis(123)).toThrow();
      expect(() => detector.findEmojis({})).toThrow();
    });
  });

  describe('removeEmojis method', () => {
    test('should remove Unicode emojis', () => {
      const result = detector.removeEmojis('Hello ✨ world 🚀');
      expect(result).toBe('Hello  world ');
    });

    test('should remove shortcode emojis', () => {
      const result = detector.removeEmojis('Hello :rocket: world :fire:');
      expect(result).toBe('Hello  world ');
    });

    test('should not remove shortcodes when disabled', () => {
      const customDetector = new EmojiDetector({ includeShortcodes: false });
      const result = customDetector.removeEmojis('Hello :rocket: world');
      expect(result).toBe('Hello :rocket: world');
    });

    test('should remove emoji sequences', () => {
      const result = detector.removeEmojis('Developer 👨‍💻 working');
      expect(result).toBe('Developer  working');
    });

    test('should remove emojis with skin tones', () => {
      const result = detector.removeEmojis('Wave 👋🏽 hello');
      expect(result).toBe('Wave  hello');
    });

    test('should remove flag emojis', () => {
      const result = detector.removeEmojis('Country 🇺🇸 flag');
      expect(result).toBe('Country  flag');
    });

    test('should remove keycap sequences', () => {
      const result = detector.removeEmojis('Number 1️⃣ first');
      expect(result).toBe('Number  first');
    });

    test('should remove all emoji types in mixed text', () => {
      const result = detector.removeEmojis('Unicode 🚀 shortcode :fire: sequence 👨‍💻');
      expect(result).toBe('Unicode  shortcode  sequence ');
    });

    test('should handle empty strings', () => {
      const result = detector.removeEmojis('');
      expect(result).toBe('');
    });

    test('should handle text with no emojis', () => {
      const result = detector.removeEmojis('Just plain text');
      expect(result).toBe('Just plain text');
    });

    test('should handle adjacent emojis', () => {
      const result = detector.removeEmojis('🚀🔥✨');
      expect(result).toBe('');
    });

    test('should preserve whitespace structure', () => {
      const result = detector.removeEmojis('  Hello  🚀  world  ');
      expect(result).toBe('  Hello    world  ');
    });
  });

  describe('hasEmojis method', () => {
    test('should return true for Unicode emojis', () => {
      expect(detector.hasEmojis('Hello ✨')).toBe(true);
      expect(detector.hasEmojis('🚀')).toBe(true);
      expect(detector.hasEmojis('Text with 🔥 emoji')).toBe(true);
    });

    test('should return true for shortcode emojis', () => {
      expect(detector.hasEmojis('Hello :rocket:')).toBe(true);
      expect(detector.hasEmojis(':fire:')).toBe(true);
      expect(detector.hasEmojis('Text with :sparkles: emoji')).toBe(true);
    });

    test('should return false for shortcodes when disabled', () => {
      const customDetector = new EmojiDetector({ includeShortcodes: false });
      expect(customDetector.hasEmojis('Hello :rocket:')).toBe(false);
    });

    test('should return true for emoji sequences', () => {
      expect(detector.hasEmojis('Developer 👨‍💻')).toBe(true);
      expect(detector.hasEmojis('Family 👨‍👩‍👧‍👦')).toBe(true);
    });

    test('should return true for emojis with skin tones', () => {
      expect(detector.hasEmojis('Wave 👋🏽')).toBe(true);
    });

    test('should return true for flag emojis', () => {
      expect(detector.hasEmojis('Country 🇺🇸')).toBe(true);
    });

    test('should return true for keycap sequences', () => {
      expect(detector.hasEmojis('Number 1️⃣')).toBe(true);
    });

    test('should return false for plain text', () => {
      expect(detector.hasEmojis('Hello world')).toBe(false);
      expect(detector.hasEmojis('Just plain text')).toBe(false);
      expect(detector.hasEmojis('123 456')).toBe(false);
    });

    test('should return false for empty strings', () => {
      expect(detector.hasEmojis('')).toBe(false);
    });

    test('should return true for mixed content', () => {
      expect(detector.hasEmojis('Unicode 🚀 and shortcode :fire:')).toBe(true);
    });

    test('should be case sensitive for shortcodes', () => {
      expect(detector.hasEmojis(':ROCKET:')).toBe(false);
      expect(detector.hasEmojis(':rocket:')).toBe(true);
    });
  });

  describe('performance tests', () => {
    test('should process small text quickly', () => {
      const startTime = performance.now();
      detector.findEmojis(TEST_DATA.PERFORMANCE.SMALL);
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(10); // 10ms for small text
    });

    test('should process medium text within acceptable time', () => {
      const startTime = performance.now();
      detector.findEmojis(TEST_DATA.PERFORMANCE.MEDIUM);
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50); // 50ms for medium text
    });

    test('should process large text within target time', () => {
      const startTime = performance.now();
      detector.findEmojis(TEST_DATA.PERFORMANCE.LARGE);
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // <100ms for 1MB equivalent
    });

    test('should handle repeated operations efficiently', () => {
      const text = 'Hello 🚀 world :fire: test 👨‍💻';
      const iterations = 1000;
      
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        detector.hasEmojis(text);
      }
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should handle 1000 operations quickly
    });
  });

  describe('edge cases', () => {
    test('should handle special characters that look like emojis', () => {
      const result = detector.findEmojis('Copyright © symbol');
      expect(result).toHaveLength(0);
    });

    test('should handle malformed shortcodes', () => {
      const result = detector.findEmojis('Broken :rocket shortcode');
      expect(result).toHaveLength(0);
    });

    test('should handle nested colons in shortcodes', () => {
      const result = detector.findEmojis('Text :a:b:c: more text');
      expect(result).toHaveLength(0); // Invalid shortcode format
    });

    test('should handle very long shortcodes', () => {
      const longShortcode = ':' + 'a'.repeat(100) + ':';
      const result = detector.findEmojis(`Text ${longShortcode} more`);
      expect(result).toHaveLength(0); // Should be rejected as too long
    });

    test('should handle unicode variation selectors', () => {
      const result = detector.findEmojis('Heart ❤️ with variation selector');
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('❤️');
    });

    test('should handle zero-width characters in sequences', () => {
      const result = detector.findEmojis('Family 👨‍👩‍👧‍👦 emoji');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('sequence');
    });

    test('should handle emoji at start and end of text', () => {
      const result = detector.findEmojis('🚀 middle text 🔥');
      expect(result).toHaveLength(2);
      expect(result[0].startIndex).toBe(0);
      expect(result[1].emoji).toBe('🔥');
    });

    test('should handle text with only emojis', () => {
      const result = detector.findEmojis('🚀🔥✨');
      expect(result).toHaveLength(3);
    });
  });

  describe('test data validation', () => {
    test('should detect all basic Unicode emojis from test data', () => {
      TEST_DATA.UNICODE_BASIC.forEach(emoji => {
        const result = detector.findEmojis(emoji);
        expect(result).toHaveLength(1);
        expect(result[0].emoji).toBe(emoji);
      });
    });

    test('should detect all skin tone emojis from test data', () => {
      TEST_DATA.SKIN_TONES.forEach(emoji => {
        const result = detector.findEmojis(emoji);
        expect(result).toHaveLength(1);
        expect(result[0].emoji).toBe(emoji);
      });
    });

    test('should detect all sequence emojis from test data', () => {
      TEST_DATA.SEQUENCES.forEach(emoji => {
        const result = detector.findEmojis(emoji);
        expect(result).toHaveLength(1);
        expect(result[0].emoji).toBe(emoji);
      });
    });

    test('should detect all flag emojis from test data', () => {
      TEST_DATA.FLAGS.forEach(emoji => {
        const result = detector.findEmojis(emoji);
        expect(result).toHaveLength(1);
        expect(result[0].emoji).toBe(emoji);
      });
    });

    test('should detect all keycap emojis from test data', () => {
      TEST_DATA.KEYCAPS.forEach(emoji => {
        const result = detector.findEmojis(emoji);
        expect(result).toHaveLength(1);
        expect(result[0].emoji).toBe(emoji);
      });
    });

    test('should handle all mixed content from test data', () => {
      TEST_DATA.MIXED_CONTENT.forEach(text => {
        const result = detector.findEmojis(text);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test('should handle all edge cases from test data', () => {
      TEST_DATA.EDGE_CASES.forEach(text => {
        // Should not throw errors
        expect(() => {
          detector.findEmojis(text);
        }).not.toThrow();
      });
    });
  });
});