/**
 * Output Formatter for emoji-linter CLI
 * Provides table, JSON, and minimal output formats
 */

/* eslint-disable no-control-regex */

const { OutputError } = require('./errors');

/**
 * Output formatter class
 */
class OutputFormatter {
  /**
   * Creates a new OutputFormatter instance
   * @param {Object} options - Formatting options
   * @param {boolean} [options.useColors=true] - Whether to use color formatting
   * @param {number} [options.maxContextLines=3] - Maximum context lines to show
   */
  constructor(options = {}) {
    this.options = {
      useColors: true,
      maxContextLines: 3,
      ...options
    };
  }

  /**
   * Format results based on specified format
   * @param {Array} results - Array of file results with emoji detections
   * @param {string} format - Output format ('table', 'json', 'minimal')
   * @param {Object} summary - Summary statistics
   * @returns {string} Formatted output
   */
  formatResults(results, format = 'table', summary = {}) {
    switch (format.toLowerCase()) {
    case 'table':
      return this.formatTable(results, summary);
    case 'json':
      return this.formatJSON(results, summary);
    case 'minimal':
      return this.formatMinimal(results, summary);
    default:
      throw new OutputError(`Unsupported output format: ${format}`, format);
    }
  }

  /**
   * Format results as a table
   * @param {Array} results - File results
   * @param {Object} summary - Summary statistics
   * @returns {string} Table-formatted output
   */
  formatTable(results, summary) {
    const lines = [];
    
    // Add header
    lines.push(this.colorize('Emoji Detection Results', 'header'));
    lines.push('');

    // Filter results to only show files with emojis
    const filesWithEmojis = results.filter(result => 
      result.emojis && result.emojis.length > 0
    );

    if (filesWithEmojis.length === 0) {
      lines.push(this.colorize('No emojis found in any files.', 'success'));
      return lines.join('\n');
    }

    // Table header
    const header = this.formatTableRow(['File', 'Line', 'Column', 'Emoji', 'Type'], true);
    lines.push(header);
    lines.push(this.createSeparator(header.replace(/\x1b\[[0-9;]*m/g, '').length));

    // Table rows
    for (const result of filesWithEmojis) {
      for (const emoji of result.emojis) {
        const row = this.formatTableRow([
          this.truncatePath(result.filePath, 40),
          emoji.lineNumber.toString(),
          emoji.columnStart.toString(),
          emoji.emoji,
          this.colorize(emoji.type, 'type')
        ]);
        lines.push(row);
      }
    }

    // Add summary
    lines.push('');
    lines.push(this.formatSummary(summary));

    return lines.join('\n');
  }

  /**
   * Format results as JSON
   * @param {Array} results - File results
   * @param {Object} summary - Summary statistics
   * @returns {string} JSON-formatted output
   */
  formatJSON(results, summary) {
    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: summary.totalFiles || 0,
        filesWithEmojis: summary.filesWithEmojis || 0,
        totalEmojis: summary.totalEmojis || 0,
        emojiTypes: summary.emojiTypes || {},
        ...summary
      },
      files: results.map(result => ({
        filePath: result.filePath,
        emojiCount: result.emojis ? result.emojis.length : 0,
        emojis: result.emojis || [],
        ...(result.error && { error: result.error.message })
      }))
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Format results in minimal format
   * @param {Array} results - File results
   * @param {Object} summary - Summary statistics
   * @returns {string} Minimal-formatted output
   */
  formatMinimal(results, summary) {
    const lines = [];

    // Show only files with emojis in format: file:line:column: emoji (type)
    for (const result of results) {
      if (result.emojis && result.emojis.length > 0) {
        for (const emoji of result.emojis) {
          lines.push(
            `${result.filePath}:${emoji.lineNumber}:${emoji.columnStart}: ` +
            `${emoji.emoji} (${emoji.type})`
          );
        }
      }
    }

    // Add summary line
    const totalEmojis = summary.totalEmojis || 0;
    const filesWithEmojis = summary.filesWithEmojis || 0;
    
    if (totalEmojis > 0) {
      lines.push(`Found ${totalEmojis} emojis in ${filesWithEmojis} files`);
    } else {
      lines.push('No emojis found');
    }

    return lines.join('\n');
  }

  /**
   * Format diff output showing changes
   * @param {Array} diffs - Array of diff objects
   * @param {string} format - Output format
   * @returns {string} Formatted diff output
   */
  formatDiff(diffs, format = 'table') {
    if (format === 'json') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        diffs: diffs.map(diff => ({
          filePath: diff.filePath,
          hasChanges: diff.hasChanges,
          changes: diff.changes || []
        }))
      }, null, 2);
    }

    const lines = [];
    lines.push(this.colorize('Emoji Removal Preview', 'header'));
    lines.push('');

    const filesWithChanges = diffs.filter(diff => diff.hasChanges);

    if (filesWithChanges.length === 0) {
      lines.push(this.colorize('No differences found - no emojis to remove.', 'success'));
      return lines.join('\n');
    }

    for (const diff of filesWithChanges) {
      lines.push(this.colorize(`--- ${diff.filePath}`, 'removed'));
      lines.push(this.colorize(`+++ ${diff.filePath} (after emoji removal)`, 'added'));
      lines.push('');

      if (diff.changes && diff.changes.length > 0) {
        for (const change of diff.changes) {
          lines.push(this.colorize(`@@ -${change.lineNumber},1 +${change.lineNumber},1 @@`, 'info'));
          lines.push(this.colorize(`-${change.before}`, 'removed'));
          lines.push(this.colorize(`+${change.after}`, 'added'));
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Format list output
   * @param {Array} results - File results
   * @param {string} format - Output format
   * @returns {string} Formatted list output
   */
  formatList(results, format = 'table') {
    const filesWithEmojis = results.filter(result => 
      result.emojis && result.emojis.length > 0
    );

    if (format === 'json') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        filesWithEmojis: filesWithEmojis.map(result => ({
          filePath: result.filePath,
          emojiCount: result.emojis.length,
          emojiTypes: this.getEmojiTypes(result.emojis)
        }))
      }, null, 2);
    }

    const lines = [];
    lines.push(this.colorize('Files Containing Emojis', 'header'));
    lines.push('');

    if (filesWithEmojis.length === 0) {
      lines.push(this.colorize('No files contain emojis.', 'success'));
      return lines.join('\n');
    }

    if (format === 'minimal') {
      for (const result of filesWithEmojis) {
        lines.push(`${result.filePath} (${result.emojis.length} emojis)`);
      }
    } else {
      // Table format
      const header = this.formatTableRow(['File', 'Emoji Count', 'Types'], true);
      lines.push(header);
      lines.push(this.createSeparator(header.replace(/\x1b\[[0-9;]*m/g, '').length));

      for (const result of filesWithEmojis) {
        const types = this.getEmojiTypes(result.emojis);
        const row = this.formatTableRow([
          this.truncatePath(result.filePath, 50),
          result.emojis.length.toString(),
          Object.keys(types).join(', ')
        ]);
        lines.push(row);
      }
    }

    lines.push('');
    lines.push(`Total files with emojis: ${this.colorize(filesWithEmojis.length.toString(), 'number')}`);

    return lines.join('\n');
  }

  /**
   * Format a table row with proper padding
   * @param {Array} columns - Column values
   * @param {boolean} [isHeader=false] - Whether this is a header row
   * @returns {string} Formatted row
   */
  formatTableRow(columns, isHeader = false) {
    const widths = [40, 6, 8, 12, 10]; // Column widths
    const paddedColumns = columns.map((col, i) => {
      const width = widths[i] || 10;
      const str = col.toString();
      const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, ''); // Remove color codes for length calc
      const padding = Math.max(0, width - cleanStr.length);
      return str + ' '.repeat(padding);
    });

    const row = `| ${paddedColumns.join(' | ')} |`;
    return isHeader ? this.colorize(row, 'header') : row;
  }

  /**
   * Create table separator line
   * @param {number} length - Length of separator
   * @returns {string} Separator line
   */
  createSeparator(length) {
    return '-'.repeat(Math.max(length, 80));
  }

  /**
   * Format summary statistics
   * @param {Object} summary - Summary statistics
   * @returns {string} Formatted summary
   */
  formatSummary(summary) {
    const lines = [];
    lines.push(this.colorize('Summary:', 'header'));
    lines.push(`Total files processed: ${this.colorize(summary.totalFiles || 0, 'number')}`);
    lines.push(`Files with emojis: ${this.colorize(summary.filesWithEmojis || 0, 'number')}`);
    lines.push(`Total emojis found: ${this.colorize(summary.totalEmojis || 0, 'number')}`);
    
    if (summary.emojiTypes && Object.keys(summary.emojiTypes).length > 0) {
      lines.push('Emoji types:');
      for (const [type, count] of Object.entries(summary.emojiTypes)) {
        lines.push(`  ${type}: ${this.colorize(count, 'number')}`);
      }
    }

    if (summary.errors && summary.errors.length > 0) {
      lines.push(`Files with errors: ${this.colorize(summary.errors.length, 'error')}`);
    }

    return lines.join('\n');
  }

  /**
   * Get emoji types from emoji list
   * @param {Array} emojis - List of emoji objects
   * @returns {Object} Emoji type counts
   */
  getEmojiTypes(emojis) {
    const types = {};
    for (const emoji of emojis) {
      types[emoji.type] = (types[emoji.type] || 0) + 1;
    }
    return types;
  }

  /**
   * Truncate file path for display
   * @param {string} filePath - File path to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated path
   */
  truncatePath(filePath, maxLength) {
    if (filePath.length <= maxLength) {
      return filePath;
    }

    const parts = filePath.split('/');
    if (parts.length <= 2) {
      return `...${filePath.slice(-(maxLength - 3))}`;
    }

    // Try to keep filename and one directory
    let result = parts[parts.length - 1];
    let i = parts.length - 2;
    
    while (i >= 0 && result.length + parts[i].length + 4 <= maxLength) {
      result = parts[i] + '/' + result;
      i--;
    }

    return i >= 0 ? '.../' + result : result;
  }

  /**
   * Apply color formatting to text
   * @param {string} text - Text to colorize
   * @param {string} type - Color type
   * @returns {string} Colorized text
   */
  colorize(text, type) {
    if (!this.options.useColors || !this.shouldUseColors()) {
      return text;
    }

    const colors = {
      header: '\x1b[1m\x1b[36m',    // Bold cyan
      success: '\x1b[32m',          // Green
      error: '\x1b[31m',            // Red
      warning: '\x1b[33m',          // Yellow
      info: '\x1b[36m',             // Cyan
      number: '\x1b[35m',           // Magenta
      type: '\x1b[33m',             // Yellow
      added: '\x1b[32m',            // Green
      removed: '\x1b[31m',          // Red
      reset: '\x1b[0m'              // Reset
    };

    const color = colors[type] || '';
    const reset = colors.reset;

    return color + text + reset;
  }

  /**
   * Check if terminal supports colors
   * @returns {boolean} True if colors should be used
   */
  shouldUseColors() {
    if (process.env.NO_COLOR) {
      return false;
    }

    if (process.env.FORCE_COLOR) {
      return true;
    }

    return process.stdout.isTTY;
  }
}

/**
 * Utility functions for output formatting
 */
const OutputUtils = {
  /**
   * Create a progress indicator for long operations
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {number} [width=40] - Progress bar width
   * @returns {string} Progress bar string
   */
  createProgressBar(current, total, width = 40) {
    const percentage = Math.min(100, Math.floor((current / total) * 100));
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${current}/${total})`;
  },

  /**
   * Format file size in human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${units[i]}`;
  },

  /**
   * Format duration in human-readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
};

/**
 * Format output based on format and data
 * @param {Array} results - Results to format
 * @param {string} format - Output format
 * @param {Object} summary - Summary statistics
 * @param {Object} options - Formatting options
 * @returns {string} Formatted output
 */
function formatOutput(results, format = 'table', summary = {}, options = {}) {
  const formatter = new OutputFormatter(options);
  return formatter.formatResults(results, format, summary);
}

module.exports = {
  OutputFormatter,
  OutputUtils,
  formatOutput
};