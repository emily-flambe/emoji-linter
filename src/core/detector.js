/**
 * EmojiDetector - Core emoji detection and manipulation class
 * 
 * This class provides comprehensive emoji detection capabilities including:
 * - Unicode emoji detection (all categories)
 * - Shortcode emoji detection (:emoji_name:)
 * - Emoji sequences (ZWJ, skin tones, flags, keycaps, tag sequences)
 * - Position and line number tracking
 * - Performance optimization for large text processing
 * 
 * @author emoji-linter
 * @version 1.0.0
 * @license MIT
 */

const { PATTERNS } = require('../utils/patterns');

/**
 * EmojiDetector class for detecting and manipulating emojis in text
 */
class EmojiDetector {
  /**
   * Creates a new EmojiDetector instance
   * @param {Object} config - Configuration options
   * @param {boolean} config.includeShortcodes - Whether to detect shortcode emojis (default: true)
   * @param {number} config.maxTextLength - Maximum text length to process (default: 1000000)
   * @param {number} config.maxShortcodeLength - Maximum shortcode length (default: 50)
   * @param {boolean} config.caseSensitive - Whether shortcode detection is case sensitive (default: true)
   */
  constructor(config = {}) {
    this.config = {
      includeShortcodes: true,
      maxTextLength: 1000000,
      maxShortcodeLength: 50,
      caseSensitive: true,
      ...config
    };

    // Pre-compile regex patterns for performance
    this._patterns = this._compilePatterns();
  }

  /**
   * Compile and cache regex patterns based on configuration
   * @private
   * @returns {Object} Compiled regex patterns
   */
  _compilePatterns() {
    const patterns = {
      // Use single comprehensive pattern to avoid overlaps
      allEmojis: PATTERNS.ALL_EMOJIS
    };

    if (this.config.includeShortcodes) {
      // Create a more restrictive shortcode pattern that excludes nested colons
      // Only match lowercase letters, numbers, and underscores/hyphens
      const shortcodePattern = this.config.caseSensitive 
        ? ':([a-z0-9_+\\-]+):'  // Only lowercase for case-sensitive
        : ':([a-zA-Z0-9_+\\-]+):';  // Mixed case for case-insensitive
      
      patterns.shortcodeEmoji = new RegExp(shortcodePattern, 'g');
    }

    return patterns;
  }

  /**
   * Check if a character is an actual emoji and not just a Unicode character
   * @private
   * @param {string} char - The character to check
   * @returns {boolean} True if it's an actual emoji
   */
  _isActualEmoji(char) {
    // Exclude common non-emoji Unicode characters that might match patterns
    const nonEmojiChars = ['©', '®', '™'];
    
    if (nonEmojiChars.includes(char)) {
      return false;
    }

    // Always allow keycap sequences, flags, tags, and ZWJ sequences
    if (char.match(PATTERNS.KEYCAP_SEQUENCES) ||
        char.match(PATTERNS.FLAG_EMOJIS) ||
        char.match(PATTERNS.TAG_SEQUENCES) ||
        char.match(PATTERNS.ZWJ_SEQUENCES)) {
      return true;
    }

    // Use Unicode properties for comprehensive emoji detection
    return (
      char.match(PATTERNS.EMOJI_PRESENTATION) ||
      char.match(PATTERNS.EXTENDED_PICTOGRAPHIC) ||
      (char.match(PATTERNS.EMOJI_UNICODE) && char.codePointAt(0) >= 0x1F300)
    );
  }

  /**
   * Detect the type of emoji based on its content and patterns
   * @private
   * @param {string} emoji - The emoji to classify
   * @returns {string} The emoji type
   */
  _detectEmojiType(emoji) {
    // Check shortcodes first (if enabled)
    if (this.config.includeShortcodes && emoji.startsWith(':') && emoji.endsWith(':')) {
      return 'shortcode';
    }

    // Check specific Unicode emoji types in order of specificity
    if (emoji.match(PATTERNS.TAG_SEQUENCES)) {
      return 'tag_sequence';
    }
    
    if (emoji.match(PATTERNS.FLAG_EMOJIS)) {
      return 'flag';
    }
    
    if (emoji.match(PATTERNS.KEYCAP_SEQUENCES)) {
      return 'keycap';
    }
    
    if (emoji.match(PATTERNS.ZWJ_SEQUENCES)) {
      return 'sequence';
    }

    // Default to unicode for all other emoji types
    return 'unicode';
  }

  /**
   * Calculate line and column position for a given index in text
   * @private
   * @param {string} text - The full text
   * @param {number} index - The character index
   * @param {number} baseLineNumber - Base line number to add to
   * @returns {Object} Line and column information
   */
  _getPosition(text, index, baseLineNumber = 1) {
    const textUpToIndex = text.substring(0, index);
    const lines = textUpToIndex.split('\n');
    const lineNumber = baseLineNumber + lines.length - 1;
    const columnStart = lines[lines.length - 1].length + 1;
    
    return { lineNumber, columnStart };
  }

  /**
   * Find all emojis in the given text with detailed position information
   * @param {string} text - Text to search for emojis
   * @param {number} lineNumber - Optional line number for multiline contexts (default: 1)
   * @returns {Array<Object>} Array of emoji objects with position info
   * @throws {Error} If text is null, undefined, not a string, or exceeds max length
   */
  findEmojis(text, lineNumber = null) {
    // Input validation
    if (text === null || text === undefined) {
      throw new Error('Text cannot be null or undefined');
    }
    
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }

    if (text.length > this.config.maxTextLength) {
      throw new Error('Text exceeds maximum length');
    }

    // Handle empty strings
    if (text.length === 0) {
      return [];
    }

    const results = [];
    const processedRanges = new Set();

    // First, find shortcodes if enabled (they don't overlap with Unicode emojis)
    if (this.config.includeShortcodes && this._patterns.shortcodeEmoji) {
      // Use a smarter approach to avoid overlapping shortcodes
      const shortcodeMatches = [];
      this._patterns.shortcodeEmoji.lastIndex = 0;
      
      let match;
      while ((match = this._patterns.shortcodeEmoji.exec(text)) !== null) {
        shortcodeMatches.push({
          match: match[0],
          content: match[1],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
      
      // Filter out overlapping and invalid shortcodes
      const validShortcodes = [];
      
      // First, find patterns like :a:b:c: that contain nested colons
      const nestedColonPattern = /:([^:]+:){2,}[^:]*:/g;
      const malformedRanges = [];
      let nestedMatch;
      while ((nestedMatch = nestedColonPattern.exec(text)) !== null) {
        malformedRanges.push({
          start: nestedMatch.index,
          end: nestedMatch.index + nestedMatch[0].length
        });
      }
      
      for (const current of shortcodeMatches) {
        const shortcodeContent = current.content;
        
        // Skip invalid shortcodes (too long, empty, or with invalid chars)
        if (shortcodeContent.length > this.config.maxShortcodeLength || 
            shortcodeContent.length === 0 || 
            shortcodeContent.includes(':')) {
          continue;
        }
        
        // Skip if this shortcode is within a malformed range
        const inMalformedRange = malformedRanges.some(range => 
          current.startIndex >= range.start && current.endIndex <= range.end
        );
        if (inMalformedRange) {
          continue;
        }
        
        // Check for overlap with existing valid shortcodes
        const overlaps = validShortcodes.some(valid => 
          (current.startIndex < valid.endIndex && current.endIndex > valid.startIndex)
        );
        
        if (!overlaps) {
          validShortcodes.push(current);
        }
      }
      
      // Add valid shortcodes to results
      for (const shortcode of validShortcodes) {
        const { match, startIndex, endIndex } = shortcode;
        
        // Calculate position information
        let emojiLineNumber, columnStart, columnEnd;
        
        if (lineNumber !== null) {
          emojiLineNumber = lineNumber;
          columnStart = startIndex + 1;
          columnEnd = endIndex + 1;
        } else {
          const position = this._getPosition(text, startIndex);
          emojiLineNumber = position.lineNumber;
          columnStart = position.columnStart;
          columnEnd = position.columnStart + match.length;
        }

        const emojiObj = {
          emoji: match,
          type: 'shortcode',
          startIndex,
          endIndex,
          lineNumber: emojiLineNumber,
          columnStart,
          columnEnd
        };

        results.push(emojiObj);
        
        // Mark range as processed
        for (let i = startIndex; i < endIndex; i++) {
          processedRanges.add(i);
        }
      }
    }

    // Find Unicode emojis using specific patterns in order of priority
    // Order matters: more specific patterns first to avoid partial matches
    const emojiPatterns = [
      { pattern: PATTERNS.TAG_SEQUENCES, name: 'tag_sequence' },
      { pattern: PATTERNS.KEYCAP_SEQUENCES, name: 'keycap' },
      { pattern: PATTERNS.FLAG_EMOJIS, name: 'flag' },
      { pattern: PATTERNS.ZWJ_SEQUENCES, name: 'sequence' },
      { pattern: PATTERNS.EMOJI_SEQUENCES, name: 'unicode' }
    ];

    for (const { pattern } of emojiPatterns) {
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const startIndex = match.index;
        const endIndex = match.index + match[0].length;
        
        // Skip if any part of this range was already processed
        let overlaps = false;
        for (let i = startIndex; i < endIndex; i++) {
          if (processedRanges.has(i)) {
            overlaps = true;
            break;
          }
        }
        
        if (overlaps) {
          continue;
        }

        // Filter out non-emoji Unicode characters (like copyright symbol)
        const emoji = match[0];
        if (!this._isActualEmoji(emoji)) {
          continue;
        }

        // Calculate position information
        let emojiLineNumber, columnStart, columnEnd;
        
        if (lineNumber !== null) {
          emojiLineNumber = lineNumber;
          columnStart = startIndex + 1;
          columnEnd = endIndex + 1;
        } else {
          const position = this._getPosition(text, startIndex);
          emojiLineNumber = position.lineNumber;
          columnStart = position.columnStart;
          columnEnd = position.columnStart + emoji.length;
        }

        const emojiObj = {
          emoji: emoji,
          type: this._detectEmojiType(emoji),
          startIndex,
          endIndex,
          lineNumber: emojiLineNumber,
          columnStart,
          columnEnd
        };

        results.push(emojiObj);

        // Mark range as processed
        for (let i = startIndex; i < endIndex; i++) {
          processedRanges.add(i);
        }
      }
    }

    // Sort results by start index to maintain text order
    return results.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Remove all emojis from the given text
   * @param {string} text - Text to remove emojis from
   * @returns {string} Text with emojis removed
   * @throws {Error} If text is null, undefined, or not a string
   */
  removeEmojis(text) {
    // Input validation
    if (text === null || text === undefined) {
      throw new Error('Text cannot be null or undefined');
    }
    
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }

    if (text.length === 0) {
      return '';
    }

    if (text.length > this.config.maxTextLength) {
      throw new Error('Text exceeds maximum length');
    }

    let result = text;

    // Remove shortcodes first if enabled
    if (this.config.includeShortcodes && this._patterns.shortcodeEmoji) {
      result = result.replace(this._patterns.shortcodeEmoji, (match, content) => {
        // Only remove valid shortcodes
        if (content.length <= this.config.maxShortcodeLength && 
            content.length > 0 && 
            !content.includes(':')) {
          return '';
        }
        return match; // Keep invalid shortcodes
      });
    }

    // Remove Unicode emojis using the same patterns as findEmojis
    const emojiPatterns = [
      PATTERNS.TAG_SEQUENCES,
      PATTERNS.KEYCAP_SEQUENCES,
      PATTERNS.FLAG_EMOJIS,
      PATTERNS.ZWJ_SEQUENCES,
      PATTERNS.EMOJI_SEQUENCES
    ];

    for (const pattern of emojiPatterns) {
      result = result.replace(pattern, (match) => {
        return this._isActualEmoji(match) ? '' : match;
      });
    }

    return result;
  }

  /**
   * Check if the given text contains any emojis
   * @param {string} text - Text to check for emojis
   * @returns {boolean} True if emojis are found, false otherwise
   * @throws {Error} If text is null, undefined, or not a string
   */
  hasEmojis(text) {
    // Input validation
    if (text === null || text === undefined) {
      throw new Error('Text cannot be null or undefined');
    }
    
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }

    if (text.length === 0) {
      return false;
    }

    if (text.length > this.config.maxTextLength) {
      throw new Error('Text exceeds maximum length');
    }

    // Check shortcodes first if enabled (fast check)
    if (this.config.includeShortcodes && this._patterns.shortcodeEmoji) {
      const shortcodeMatches = text.match(this._patterns.shortcodeEmoji);
      if (shortcodeMatches) {
        // Verify at least one is a valid shortcode
        for (const match of shortcodeMatches) {
          const content = match.slice(1, -1); // Remove colons
          if (content.length <= this.config.maxShortcodeLength && 
              content.length > 0 && 
              !content.includes(':')) {
            return true;
          }
        }
      }
    }

    // Check Unicode emojis using the same patterns as findEmojis
    const emojiPatterns = [
      PATTERNS.TAG_SEQUENCES,
      PATTERNS.KEYCAP_SEQUENCES,
      PATTERNS.FLAG_EMOJIS,
      PATTERNS.ZWJ_SEQUENCES,
      PATTERNS.EMOJI_SEQUENCES
    ];

    for (const pattern of emojiPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Verify at least one is an actual emoji
        for (const match of matches) {
          if (this._isActualEmoji(match)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

module.exports = { EmojiDetector };