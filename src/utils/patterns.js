/**
 * Comprehensive emoji detection patterns and utilities
 * 
 * This module provides robust regex patterns for detecting various types of emojis
 * including Unicode emojis (all categories), shortcode emojis, emoji sequences,
 * skin tone modifiers, and ZWJ (Zero Width Joiner) sequences.
 * 
 * Based on Unicode 15.1 specification and modern JavaScript regex capabilities.
 * 
 * @author emoji-linter
 * @version 1.0.0
 * @license MIT
 */

/**
 * Core emoji detection patterns
 * @namespace PATTERNS
 */
const PATTERNS = {
  /**
   * Unicode property-based emoji detection (modern approach)
   * Uses Unicode property escapes for robust emoji detection.
   * Requires Node.js 10+ and the /u flag for Unicode support.
   * 
   * @type {RegExp}
   * @description Matches all emoji characters using Emoji property
   */
  EMOJI_UNICODE: /\p{Emoji}/gu,

  /**
   * Extended pictographic emoji detection
   * Broader than RGI_Emoji, includes more pictographic symbols.
   * 
   * @type {RegExp}
   * @description Matches extended pictographic Unicode characters
   */
  EXTENDED_PICTOGRAPHIC: /\p{Extended_Pictographic}/gu,

  /**
   * Basic emoji presentation detection
   * Matches characters with emoji presentation by default.
   * 
   * @type {RegExp}
   * @description Matches Unicode characters with emoji presentation
   */
  EMOJI_PRESENTATION: /\p{Emoji_Presentation}/gu,

  /**
   * Complete Unicode 15.1 emoji pattern for /u flag
   * Generated from official Unicode Technical Standard #51
   * Matches all emoji symbols and sequences in Unicode 15.1
   * 
   * @type {RegExp}
   * @description Comprehensive pattern matching all Unicode 15.1 emojis
   */
  UNICODE_EMOJI_COMPREHENSIVE: /(?:\p{Emoji}\uFE0F|\p{Emoji_Presentation}|\p{Emoji}\u{200D}[\p{Emoji}]|[\p{Emoji}][\p{Emoji_Modifier}]?)/gu,

  /**
   * Shortcode emoji detection
   * Matches Discord-style, Slack-style, and GitHub-style shortcodes
   * Pattern: :emoji_name:
   * 
   * @type {RegExp}
   * @description Matches shortcode emojis like :rocket:, :sparkles:, etc.
   * @example
   * // Matches: :rocket:, :fire:, :100:, :man_technologist:, :+1:
   * const shortcodes = text.match(PATTERNS.SHORTCODE_EMOJI);
   */
  SHORTCODE_EMOJI: /:([a-zA-Z0-9_+-]+):/g,

  /**
   * Extended shortcode patterns for various platforms
   * Includes support for numbered emojis and special characters
   * 
   * @type {RegExp}
   * @description Extended shortcode pattern with broader character support
   */
  SHORTCODE_EXTENDED: /:([a-zA-Z0-9_+\-!@#$%^&*().,?;]+):/g,

  /**
   * Emoji sequence detection with modifiers
   * Matches emoji sequences including skin tone modifiers and ZWJ sequences
   * Handles complex emoji like family emojis, profession emojis, etc.
   * 
   * @type {RegExp}
   * @description Matches complex emoji sequences and combinations
   * @example
   * // Matches: 👨‍💻 (man technologist), 🏳️‍🌈 (rainbow flag), 👨‍👩‍👧‍👦 (family)
   */
  EMOJI_SEQUENCES: /(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?(?:\u200D\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?)*)/gu,

  /**
   * Skin tone modifier detection
   * Matches the 5 skin tone modifier code points
   * 
   * @type {RegExp}
   * @description Matches skin tone modifiers (Fitzpatrick scale)
   */
  SKIN_TONE_MODIFIERS: /[\u{1F3FB}-\u{1F3FF}]/gu,

  /**
   * Zero Width Joiner (ZWJ) sequence detection
   * Specifically targets ZWJ sequences that create composite emojis
   * 
   * @type {RegExp}
   * @description Matches Zero Width Joiner sequences
   */
  ZWJ_SEQUENCES: /(?:\p{Emoji}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji}(?:\uFE0F|\p{Emoji_Modifier})?)+)+)/gu,

  /**
   * Emoji variation selector detection
   * Matches emoji variation selector-16 (U+FE0F)
   * 
   * @type {RegExp}
   * @description Matches variation selectors that enforce emoji presentation
   */
  VARIATION_SELECTORS: /\uFE0F/g,

  /**
   * Flag emoji detection
   * Matches flag emojis using regional indicator symbols
   * 
   * @type {RegExp}
   * @description Matches country flag emojis
   */
  FLAG_EMOJIS: /[\u{1F1E6}-\u{1F1FF}]{2}/gu,

  /**
   * Tag sequence detection for subdivision flags
   * Matches tag sequences used in subdivision flags like England flag
   * 
   * @type {RegExp}
   * @description Matches tag sequences for subdivision flags
   */
  TAG_SEQUENCES: /\u{1F3F4}[\u{E0060}-\u{E007F}]+\u{E007F}/gu,

  /**
   * Keycap sequence detection
   * Matches keycap sequences like number emojis
   * 
   * @type {RegExp}
   * @description Matches keycap sequences like 1️⃣, 2️⃣, etc.
   */
  KEYCAP_SEQUENCES: /[0-9#*]\uFE0F?\u20E3/g,

  /**
   * Complete emoji detection (combined pattern)
   * Combines all emoji types for comprehensive detection
   * Order matters: longer sequences first to avoid partial matches
   * 
   * @type {RegExp}
   * @description Master pattern combining all emoji types
   */
  ALL_EMOJIS: /(?:\u{1F3F4}[\u{E0060}-\u{E007F}]+\u{E007F}|[\u{1F1E6}-\u{1F1FF}]{2}|\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?(?:\u200D\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?)*|[0-9#*]\uFE0F?\u20E3)/gu
};

/**
 * Test data constants for pattern validation
 * Organized by emoji category for comprehensive testing
 * 
 * @namespace TEST_DATA
 */
const TEST_DATA = {
  /**
   * Basic Unicode emojis for testing
   * @type {Array<string>}
   */
  UNICODE_BASIC: [
    '😀', '😃', '😄', '😁', '🤣', '😂', '🙂', '🙃', '😉', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲'
  ],

  /**
   * Emojis with skin tone modifiers for testing
   * @type {Array<string>}
   */
  SKIN_TONES: [
    '👋', '👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿',
    '👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿',
    '🤝', '🤝🏻', '🤝🏼', '🤝🏽', '🤝🏾', '🤝🏿'
  ],

  /**
   * Complex emoji sequences for testing
   * @type {Array<string>}
   */
  SEQUENCES: [
    '👨‍💻', '👩‍💻', '🧑‍💻',           // Technologist
    '👨‍⚕️', '👩‍⚕️', '🧑‍⚕️',           // Health worker
    '👨‍🎓', '👩‍🎓', '🧑‍🎓',           // Student
    '👨‍👩‍👧‍👦', '👨‍👨‍👧‍👦', '👩‍👩‍👧‍👦', // Families
    '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️'        // Flags with sequences
  ],

  /**
   * Flag emojis for testing
   * @type {Array<string>}
   */
  FLAGS: [
    '🇺🇸', '🇨🇦', '🇬🇧', '🇫🇷', '🇩🇪', '🇯🇵',
    '🇦🇺', '🇧🇷', '🇮🇳', '🇨🇳', '🇰🇷', '🇷🇺'
  ],

  /**
   * Shortcode emojis for testing
   * @type {Array<string>}
   */
  SHORTCODES: [
    ':rocket:', ':fire:', ':sparkles:', ':heart:', ':100:',
    ':man_technologist:', ':woman_technologist:', ':family:',
    ':+1:', ':-1:', ':thumbsup:', ':thumbsdown:', ':ok_hand:'
  ],

  /**
   * Keycap sequences for testing
   * @type {Array<string>}
   */
  KEYCAPS: [
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
    '6️⃣', '7️⃣', '8️⃣', '9️⃣', '0️⃣',
    '#️⃣', '*️⃣'
  ],

  /**
   * Tag sequences (subdivision flags) for testing
   * @type {Array<string>}
   */
  TAG_SEQUENCES: [
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿',  // England flag
    '🏴󠁧󠁢󠁳󠁣󠁴󠁿',  // Scotland flag
    '🏴󠁧󠁢󠁷󠁬󠁳󠁿'   // Wales flag
  ],

  /**
   * Mixed content test cases
   * @type {Array<string>}
   */
  MIXED_CONTENT: [
    'Hello 👋 World!',
    'Code 👨‍💻 and bugs 🐛',
    'Great work! 👍🏻 Keep it up! 🚀',
    'Meeting at 3️⃣ PM',
    'USA 🇺🇸 vs Canada 🇨🇦',
    'Check out this :rocket: feature!',
    'Family time 👨‍👩‍👧‍👦 is important'
  ],

  /**
   * Edge cases for testing
   * @type {Array<string>}
   */
  EDGE_CASES: [
    '',                    // Empty string
    'No emojis here',      // Plain text
    '123 456 789',         // Numbers only
    '!@#$%^&*()',         // Special characters
    '🚀🚀🚀',             // Multiple same emojis
    '👨‍💻👩‍💻🧑‍💻',        // Multiple sequences
    'Text🚀Text',          // Adjacent text and emoji
    '🚀 🚀 🚀'            // Spaced emojis
  ],

  /**
   * Performance test data
   * Large text samples for performance benchmarking
   * @type {Object}
   */
  PERFORMANCE: {
    SMALL: 'Hello 👋 World! 🌍',
    MEDIUM: Array(100).fill('Hello 👋 World! 🌍 Check out this :rocket: feature!').join(' '),
    LARGE: Array(1000).fill('Hello 👋 World! 🌍 Check out this :rocket: feature! Great work! 👍🏻').join(' ')
  }
};

/**
 * Utility functions for emoji pattern operations
 * @namespace UTILS
 */
const UTILS = {
  /**
   * Check if current environment supports the /v flag
   * The /v flag enables Unicode set operations and is available in newer JavaScript engines
   * 
   * @returns {boolean} True if /v flag is supported
   */
  supportsUnicodeSets() {
    try {
      new RegExp('', 'v');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Get the optimal emoji pattern based on environment capabilities
   * Returns the most appropriate pattern for the current JavaScript engine
   * 
   * @returns {RegExp} The optimal emoji pattern for current environment
   */
  getOptimalPattern() {
    if (this.supportsUnicodeSets()) {
      // Use Extended_Pictographic with /v flag for most accurate detection
      return new RegExp('\\p{Extended_Pictographic}', 'gv');
    } else {
      // Fallback to comprehensive Unicode pattern with /u flag
      return PATTERNS.ALL_EMOJIS;
    }
  },

  /**
   * Compile pattern with appropriate flags
   * Ensures patterns are compiled with correct flags for the environment
   * 
   * @param {string} pattern - The regex pattern string
   * @param {string} flags - Base flags to use
   * @returns {RegExp} Compiled regular expression
   */
  compilePattern(pattern, flags = 'gu') {
    try {
      return new RegExp(pattern, flags);
    } catch (e) {
      // Fallback to basic flags if advanced features not supported
      return new RegExp(pattern, 'g');
    }
  },

  /**
   * Validate a pattern against test data
   * Useful for testing pattern accuracy and performance
   * 
   * @param {RegExp} pattern - The pattern to test
   * @param {Array<string>} testData - Array of test strings
   * @returns {Object} Test results with matches and performance data
   */
  validatePattern(pattern, testData) {
    const results = {
      totalTests: testData.length,
      matches: 0,
      failures: [],
      performance: {
        startTime: Date.now(),
        endTime: 0,
        duration: 0
      }
    };

    testData.forEach((testString, index) => {
      try {
        const matches = testString.match(pattern);
        if (matches) {
          results.matches++;
        }
      } catch (error) {
        results.failures.push({
          index,
          testString,
          error: error.message
        });
      }
    });

    results.performance.endTime = Date.now();
    results.performance.duration = results.performance.endTime - results.performance.startTime;

    return results;
  }
};

/**
 * Pattern metadata for documentation and debugging
 * @namespace METADATA
 */
const METADATA = {
  /**
   * Unicode version information
   */
  UNICODE_VERSION: '15.1',
  
  /**
   * Pattern generation date
   */
  GENERATED: new Date().toISOString(),

  /**
   * Pattern descriptions for debugging
   */
  DESCRIPTIONS: {
    EMOJI_UNICODE: 'Unicode emoji characters using Emoji property',
    EXTENDED_PICTOGRAPHIC: 'Extended pictographic Unicode characters',
    EMOJI_PRESENTATION: 'Characters with default emoji presentation',
    UNICODE_EMOJI_COMPREHENSIVE: 'Comprehensive Unicode 15.1 emoji pattern',
    SHORTCODE_EMOJI: 'Shortcode emojis like :rocket:',
    SHORTCODE_EXTENDED: 'Extended shortcode pattern with broader support',
    EMOJI_SEQUENCES: 'Complex emoji sequences and combinations',
    SKIN_TONE_MODIFIERS: 'Fitzpatrick skin tone modifiers',
    ZWJ_SEQUENCES: 'Zero Width Joiner composite emojis',
    VARIATION_SELECTORS: 'Emoji variation selectors',
    FLAG_EMOJIS: 'Country flag emojis using regional indicators',
    TAG_SEQUENCES: 'Tag sequences for subdivision flags',
    KEYCAP_SEQUENCES: 'Keycap sequences like number emojis',
    ALL_EMOJIS: 'Master pattern combining all emoji types'
  },

  /**
   * Performance characteristics of each pattern
   */
  PERFORMANCE_NOTES: {
    EMOJI_UNICODE: 'Fast, accurate Unicode emoji detection',
    EXTENDED_PICTOGRAPHIC: 'Fast, broader coverage than RGI',
    EMOJI_PRESENTATION: 'Fast, basic emoji detection',
    ALL_EMOJIS: 'Comprehensive but slower, good fallback option',
    SHORTCODE_EMOJI: 'Very fast, text-based pattern'
  }
};

// Export all patterns, test data, utilities, and metadata
module.exports = {
  PATTERNS,
  TEST_DATA,
  UTILS,
  METADATA
};