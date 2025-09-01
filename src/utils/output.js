/**
 * Output formatting utilities for emoji-linter
 */

/**
 * Output formatter class
 */
class OutputFormatter {
  constructor(options = {}) {
    this.useColors = options.useColors !== false && process.stdout.isTTY;
  }

  /**
   * Format results based on format type
   * @param {Array} results - Results to format
   * @param {string} format - Output format
   * @param {Object} summary - Summary information
   * @returns {string} Formatted output
   */
  formatResults(results, format = 'table', summary = {}) {
    switch (format) {
    case 'json':
      return JSON.stringify({ results, summary }, null, 2);
    
    case 'minimal':
      return this.formatMinimal(results);
    
    case 'table':
    default:
      return this.formatTable(results, summary);
    }
  }

  /**
   * Format as table
   * @param {Array} results - Results to format
   * @param {Object} summary - Summary information
   * @returns {string} Table output
   */
  formatTable(results, summary) {
    let output = 'Emoji Detection Results\n\n';
    
    const hasEmojis = results.some(r => r.emojis && r.emojis.length > 0);
    
    if (!hasEmojis) {
      output += 'No emojis found in any files.\n';
    } else {
      output += '| File | Line | Column | Emoji | Type |\n';
      output += '|------|------|--------|-------|------|\n';
      
      for (const result of results) {
        if (result.emojis && result.emojis.length > 0) {
          for (const emoji of result.emojis) {
            const file = result.filePath.length > 40 
              ? '...' + result.filePath.slice(-37)
              : result.filePath;
            
            output += `| ${file} | ${emoji.lineNumber} | ${emoji.columnNumber} | ${emoji.emoji} | ${emoji.type} |\n`;
          }
        }
      }
    }
    
    if (summary && Object.keys(summary).length > 0) {
      output += '\nSummary:\n';
      output += `Total files processed: ${summary.totalFiles || 0}\n`;
      output += `Files with emojis: ${summary.filesWithEmojis || 0}\n`;
      output += `Total emojis found: ${summary.totalEmojis || 0}\n`;
      
      if (summary.emojiTypes && Object.keys(summary.emojiTypes).length > 0) {
        output += 'Emoji types:\n';
        for (const [type, count] of Object.entries(summary.emojiTypes)) {
          output += `  ${type}: ${count}\n`;
        }
      }
    }
    
    return output;
  }

  /**
   * Format as minimal output
   * @param {Array} results - Results to format
   * @returns {string} Minimal output
   */
  formatMinimal(results) {
    const lines = [];
    
    for (const result of results) {
      if (result.emojis && result.emojis.length > 0) {
        for (const emoji of result.emojis) {
          lines.push(`${result.filePath}:${emoji.lineNumber}:${emoji.columnNumber} ${emoji.emoji}`);
        }
      }
    }
    
    return lines.join('\n') || 'No emojis found.';
  }

  /**
   * Format diff output
   * @param {Array} diffs - Diff results
   * @param {string} format - Output format
   * @returns {string} Formatted diff
   */
  formatDiff(diffs, format = 'table') {
    if (format === 'json') {
      return JSON.stringify(diffs, null, 2);
    }
    
    let output = 'Diff Results\n\n';
    
    for (const diff of diffs) {
      if (diff.hasChanges) {
        output += `File: ${diff.filePath}\n`;
        output += 'Changes:\n';
        
        for (const change of diff.changes) {
          output += `  Line ${change.lineNumber}:\n`;
          output += `    - ${change.before}\n`;
          output += `    + ${change.after}\n`;
        }
        
        output += '\n';
      }
    }
    
    return output || 'No changes needed.';
  }

  /**
   * Format list output
   * @param {Array} results - Results to format
   * @param {string} format - Output format
   * @returns {string} Formatted list
   */
  formatList(results, format = 'table') {
    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }
    
    const files = results.filter(r => r.emojis && r.emojis.length > 0);
    
    if (files.length === 0) {
      return 'No files contain emojis.';
    }
    
    let output = 'Files containing emojis:\n\n';
    
    for (const file of files) {
      output += `${file.filePath} (${file.emojis.length} emojis)\n`;
    }
    
    return output;
  }
}

/**
 * Utility functions
 */
class OutputUtils {
  /**
   * Format duration
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

module.exports = {
  OutputFormatter,
  OutputUtils
};