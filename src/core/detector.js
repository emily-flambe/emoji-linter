/**
 * Emoji detector - finds and removes basic Unicode emojis
 * 
 * LIMITATIONS:
 * - Only detects emojis in specific Unicode ranges
 * - Does NOT support shortcodes (:rocket:)
 * - Limited support for sequences and modifiers
 * - Not Unicode 15.1 complete
 */

// Basic Unicode emoji regex covering common emoji ranges
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

/**
 * Find all emojis in text
 * @param {string} text - Text to search
 * @returns {Array} Array of emoji matches with location info
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
          type: 'unicode'
        });
      });
    }
  });
  
  return matches;
}

/**
 * Remove all emojis from text
 * @param {string} text - Text to clean
 * @returns {string} Text with emojis removed
 */
function removeEmojis(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  return text.replace(EMOJI_REGEX, '');
}

/**
 * Check if text contains any emojis
 * @param {string} text - Text to check
 * @returns {boolean} True if emojis found
 */
function hasEmojis(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // Need to reset the regex because test() modifies lastIndex with 'g' flag
  EMOJI_REGEX.lastIndex = 0;
  return EMOJI_REGEX.test(text);
}

// Export functions
module.exports = {
  findEmojis,
  removeEmojis,
  hasEmojis,
  EMOJI_REGEX
};