/**
 * GitHub utilities for emoji-linter GitHub Action
 */

const github = require('@actions/github');

/**
 * GitHub utilities class for managing GitHub API interactions
 */
class GitHubUtils {
  /**
   * Creates a new GitHubUtils instance
   * @param {string} token - GitHub token for API access
   * @throws {Error} When token is missing or invalid
   */
  constructor(token) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('GitHub token is required');
    }
    
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  /**
   * Posts a comment to a pull request
   * @param {number} prNumber - Pull request number
   * @param {string} commentBody - Comment body text
   * @returns {Promise<Object>} Comment creation result with id and url
   * @throws {Error} When API call fails or parameters are invalid
   */
  async postPRComment(prNumber, commentBody) {
    // Validate PR number
    if (prNumber === null || prNumber === '') {
      throw new Error('PR number is required');
    }
    
    if (typeof prNumber !== 'number' || prNumber <= 0 || !Number.isInteger(prNumber)) {
      throw new Error('PR number must be a positive integer');
    }

    // Validate comment body
    if (!commentBody || typeof commentBody !== 'string' || commentBody.trim() === '') {
      throw new Error('Comment body is required');
    }

    try {
      const response = await this.octokit.rest.issues.createComment({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: prNumber,
        body: commentBody
      });

      return {
        id: response.data.id,
        url: response.data.html_url
      };
    } catch (error) {
      throw new Error(`Failed to post PR comment: ${error.message}`);
    }
  }

  /**
   * Formats emoji linter results into a GitHub-friendly report
   * @param {Array} results - Array of file scan results
   * @param {Object} summary - Summary statistics
   * @param {string} mode - Linter mode (clean, require, forbid)
   * @returns {string} Formatted markdown report
   */
  static formatEmojiReport(results, summary, mode) {
    const { totalFiles, filesWithEmojis, totalEmojis, errors } = summary;
    
    let report = '## Emoji Linter Report\n\n';
    
    // Status and basic info
    const hasEmojis = totalEmojis > 0;
    let status;
    let statusIcon;
    let message = '';

    switch (mode) {
    case 'clean':
      statusIcon = hasEmojis ? '❌' : '✅';
      status = hasEmojis ? 'Emojis found' : 'No emojis found';
      if (hasEmojis) {
        message = 'Found emojis that should be cleaned up.';
      }
      break;
    case 'require':
      statusIcon = hasEmojis ? '✅' : '❌';
      status = hasEmojis ? 'Emojis found' : 'No emojis found';
      if (hasEmojis) {
        message = 'Great! Found the required emojis.';
      } else {
        message = 'Emojis are required but none were found.';
      }
      break;
    case 'forbid':
      statusIcon = hasEmojis ? '❌' : '✅';
      status = hasEmojis ? 'Emojis found' : 'No emojis found';
      if (hasEmojis) {
        message = 'Found emojis that are not allowed.';
      }
      break;
    default:
      statusIcon = '❓';
      status = 'Unknown mode';
    }

    report += `**Status:** ${statusIcon} ${status}\n`;
    report += `**Mode:** ${mode}\n`;
    report += `**Files scanned:** ${totalFiles}\n`;
    report += `**Files with emojis:** ${filesWithEmojis}\n`;
    report += `**Total emojis:** ${totalEmojis}\n\n`;

    if (message) {
      report += `${message}\n\n`;
    }

    // File details
    if (results.length > 0 && totalEmojis > 0) {
      report += '### Files with emojis:\n\n';
      
      const maxFilesToShow = 10;
      const filesToShow = results.slice(0, maxFilesToShow);
      const remainingFiles = Math.max(0, results.length - maxFilesToShow);

      for (const result of filesToShow) {
        if (result.emojis && result.emojis.length > 0) {
          const emojiCount = result.emojis.length;
          const emojiWord = emojiCount === 1 ? 'emoji' : 'emojis';
          
          report += `**${result.filePath}** (${emojiCount} ${emojiWord})\n`;
          
          for (const emoji of result.emojis) {
            report += `- Line ${emoji.lineNumber}, Column ${emoji.columnNumber}: ${emoji.emoji} (${emoji.type})\n`;
          }
          
          report += '\n';
        }
      }

      if (remainingFiles > 0) {
        report += `... and ${remainingFiles} more files\n\n`;
      }
    }

    // Error information
    if (errors && errors.length > 0) {
      report += '### Errors encountered:\n\n';
      for (const error of errors) {
        report += `- **${error.filePath}**: ${error.error}\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Validates GitHub Action inputs
   * @param {Object} inputs - Input parameters
   * @param {string} inputs.mode - Linter mode
   * @param {string} inputs.path - Path to scan
   * @param {string} inputs.configFile - Config file path
   * @throws {Error} When inputs are invalid
   */
  static validateInputs(inputs) {
    const { mode, path, configFile } = inputs;

    // Validate mode
    const validModes = ['clean', 'require', 'forbid'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
    }

    // Validate path
    if (!path || typeof path !== 'string' || path.trim() === '') {
      throw new Error('Path cannot be empty');
    }

    // Validate config file
    if (!configFile || typeof configFile !== 'string' || configFile.trim() === '') {
      throw new Error('Config file cannot be empty');
    }
  }

  /**
   * Checks if the current GitHub context is a pull request
   * @param {Object} context - GitHub context object
   * @returns {boolean} True if this is a pull request event
   */
  static isPullRequest(context) {
    if (!context || !context.eventName || !context.payload) {
      return false;
    }

    const isPREvent = context.eventName === 'pull_request' || 
                     context.eventName === 'pull_request_target';
    
    if (!isPREvent) {
      return false;
    }
    
    return Boolean(context.payload.pull_request && 
           typeof context.payload.pull_request.number === 'number');
  }

  /**
   * Extracts pull request number from GitHub context
   * @param {Object} context - GitHub context object
   * @returns {number|null} Pull request number or null if not a PR
   */
  static getPRNumber(context) {
    if (!context || !context.payload || !context.payload.pull_request) {
      return null;
    }

    const prNumber = context.payload.pull_request.number;
    return (typeof prNumber === 'number' && prNumber > 0) ? prNumber : null;
  }
}

module.exports = {
  GitHubUtils
};