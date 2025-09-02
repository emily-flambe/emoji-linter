const { 
  shouldIgnoreLine, 
  shouldIgnoreFile, 
  parseIgnoreComments,
  IGNORE_PATTERNS,
  FILE_IGNORE_PATTERNS 
} = require('../../../src/utils/ignore');

describe('Ignore Utils', () => {
  describe('shouldIgnoreLine', () => {
    it('should return true for line comments', () => {
      expect(shouldIgnoreLine('const x = "😀"; // emoji-linter-disable')).toBe(true);
      expect(shouldIgnoreLine('// emoji-linter-disable')).toBe(true);
      expect(shouldIgnoreLine('  // emoji-linter-disable-line')).toBe(true);
    });

    it('should return true for block comments', () => {
      expect(shouldIgnoreLine('const x = "😀"; /* emoji-linter-disable */')).toBe(true);
      expect(shouldIgnoreLine('/* emoji-linter-disable */')).toBe(true);
      expect(shouldIgnoreLine('  /* emoji-linter-disable-line */')).toBe(true);
    });

    it('should return true for hash comments', () => {
      expect(shouldIgnoreLine('# emoji-linter-disable')).toBe(true);
      expect(shouldIgnoreLine('  # emoji-linter-disable-line')).toBe(true);
    });

    it('should return true for HTML comments', () => {
      expect(shouldIgnoreLine('<!-- emoji-linter-disable -->')).toBe(true);
      expect(shouldIgnoreLine('  <!-- emoji-linter-disable-line -->')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(shouldIgnoreLine('// EMOJI-LINTER-DISABLE')).toBe(true);
      expect(shouldIgnoreLine('/* Emoji-Linter-Disable */')).toBe(true);
    });

    it('should return false for non-matching lines', () => {
      expect(shouldIgnoreLine('const x = "😀";')).toBe(false);
      expect(shouldIgnoreLine('// regular comment')).toBe(false);
      expect(shouldIgnoreLine('/* normal comment */')).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(shouldIgnoreLine(null)).toBe(false);
      expect(shouldIgnoreLine(undefined)).toBe(false);
      expect(shouldIgnoreLine(123)).toBe(false);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should return true for file-level line comments', () => {
      const content = '// emoji-linter-disable-file\nconst x = "😀";';
      expect(shouldIgnoreFile(content)).toBe(true);
    });

    it('should return true for file-level block comments', () => {
      const content = '/* emoji-linter-disable-file */\nconst x = "😀";';
      expect(shouldIgnoreFile(content)).toBe(true);
    });

    it('should return true for file-level hash comments', () => {
      const content = '# emoji-linter-disable-file\nconst x = "😀";';
      expect(shouldIgnoreFile(content)).toBe(true);
    });

    it('should return true for file-level HTML comments', () => {
      const content = '<!-- emoji-linter-disable-file -->\nconst x = "😀";';
      expect(shouldIgnoreFile(content)).toBe(true);
    });

    it('should return false for content without file-level ignore', () => {
      const content = 'const x = "😀";\n// emoji-linter-disable';
      expect(shouldIgnoreFile(content)).toBe(false);
    });

    it('should check only first 10 lines', () => {
      const lines = Array(15).fill('const x = "😀";');
      lines[12] = '// emoji-linter-disable-file';
      const content = lines.join('\n');
      expect(shouldIgnoreFile(content)).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(shouldIgnoreFile(null)).toBe(false);
      expect(shouldIgnoreFile(undefined)).toBe(false);
      expect(shouldIgnoreFile(123)).toBe(false);
    });
  });

  describe('parseIgnoreComments', () => {
    it('should return set of ignored line numbers', () => {
      const content = `const a = "😀";
// emoji-linter-disable  
const b = "👍";
const c = "🚀"; /* emoji-linter-disable */
const d = "❤️";`;
      
      const ignoredLines = parseIgnoreComments(content);
      expect(ignoredLines).toEqual(new Set([2, 4]));
    });

    it('should return empty set for content without ignore comments', () => {
      const content = `const a = "😀";
const b = "👍";
const c = "🚀";`;
      
      const ignoredLines = parseIgnoreComments(content);
      expect(ignoredLines).toEqual(new Set());
    });

    it('should handle non-string input', () => {
      expect(parseIgnoreComments(null)).toEqual(new Set());
      expect(parseIgnoreComments(undefined)).toEqual(new Set());
      expect(parseIgnoreComments(123)).toEqual(new Set());
    });
  });

  describe('patterns', () => {
    it('should export ignore patterns', () => {
      expect(IGNORE_PATTERNS).toBeDefined();
      expect(IGNORE_PATTERNS.LINE_COMMENT).toBeInstanceOf(RegExp);
      expect(IGNORE_PATTERNS.BLOCK_COMMENT).toBeInstanceOf(RegExp);
      expect(IGNORE_PATTERNS.HASH_COMMENT).toBeInstanceOf(RegExp);
      expect(IGNORE_PATTERNS.HTML_COMMENT).toBeInstanceOf(RegExp);
    });

    it('should export file ignore patterns', () => {
      expect(FILE_IGNORE_PATTERNS).toBeDefined();
      expect(FILE_IGNORE_PATTERNS.LINE_COMMENT).toBeInstanceOf(RegExp);
      expect(FILE_IGNORE_PATTERNS.BLOCK_COMMENT).toBeInstanceOf(RegExp);
      expect(FILE_IGNORE_PATTERNS.HASH_COMMENT).toBeInstanceOf(RegExp);
      expect(FILE_IGNORE_PATTERNS.HTML_COMMENT).toBeInstanceOf(RegExp);
    });
  });
});