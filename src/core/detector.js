/**
 * Simple emoji detector - no overengineering!
 * Just finds and removes Unicode emojis with a simple regex.
 * No shortcodes, no complex configuration, no premature optimization.
 */

// Simple emoji regex - this is all we need!
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

/**
 * Find all emojis in text - dead simple
 */
function findEmojis(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const matches = [];
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const emojiMatches = line.match(EMOJI_REGEX);
    if (emojiMatches) {
      emojiMatches.forEach(emoji => {
        matches.push({
          emoji,
          lineNumber: lineIndex + 1,
          columnNumber: line.indexOf(emoji) + 1,
          type: 'unicode' // We only support unicode now - much simpler!
        });
      });
    }
  });
  
  return matches;
}

/**
 * Remove all emojis from text - dead simple
 */
function removeEmojis(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  return text.replace(EMOJI_REGEX, '');
}

/**
 * Legacy class wrapper to avoid breaking existing code
 * But internally it's just simple functions!
 */
class EmojiDetector {
  constructor() {
    // No config needed - keep it simple!
  }

  /**
   * Find emojis using the simple function approach
   */
  findEmojis(text) {
    return findEmojis(text);
  }

  /**
   * Remove emojis using the simple function approach
   */
  removeEmojis(text) {
    return removeEmojis(text);
  }
}

module.exports = {
  EmojiDetector,
  findEmojis,
  removeEmojis,
  EMOJI_REGEX
};