/**
 * Edge case tests for emoji detector
 */

const detector = require('../../../src/core/detector');

describe('Detector - Edge Cases', () => {
  describe('findEmojis', () => {
    test('handles empty string', () => {
      expect(detector.findEmojis('')).toEqual([]);
    });
    
    test('handles null', () => {
      expect(detector.findEmojis(null)).toEqual([]);
    });
    
    test('handles undefined', () => {
      expect(detector.findEmojis(undefined)).toEqual([]);
    });
    
    test('handles very long strings efficiently', () => {
      const longString = 'a'.repeat(100000) + '😀' + 'b'.repeat(100000);
      const result = detector.findEmojis(longString);
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('😀');
    });
    
    test('handles strings with only emojis', () => {
      const emojiOnly = '😀😁😂🤣😃';
      const result = detector.findEmojis(emojiOnly);
      expect(result).toHaveLength(5);
    });
  });

  describe('removeEmojis', () => {
    test('handles empty string', () => {
      expect(detector.removeEmojis('')).toBe('');
    });
    
    test('handles null', () => {
      expect(detector.removeEmojis(null)).toBe(null);
    });
    
    test('handles undefined', () => {
      expect(detector.removeEmojis(undefined)).toBe(undefined);
    });
    
    test('preserves whitespace when removing emojis', () => {
      expect(detector.removeEmojis('Hello 😀 World')).toBe('Hello  World');
      expect(detector.removeEmojis('😀\n😁\t😂')).toBe('\n\t');
    });
  });

  describe('hasEmojis', () => {
    test('handles empty string', () => {
      expect(detector.hasEmojis('')).toBe(false);
    });
    
    test('handles null', () => {
      expect(detector.hasEmojis(null)).toBe(false);
    });
    
    test('handles undefined', () => {
      expect(detector.hasEmojis(undefined)).toBe(false);
    });
    
    test('detects emojis at string boundaries', () => {
      expect(detector.hasEmojis('😀start')).toBe(true);
      expect(detector.hasEmojis('end😀')).toBe(true);
      expect(detector.hasEmojis('😀')).toBe(true);
    });
  });
});