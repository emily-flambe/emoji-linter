/**
 * GitHub Action entry point for emoji-linter
 * Uses CLI implementation internally with GitHub-specific functionality
 */

const core = require('@actions/core');
const github = require('@actions/github');
const { CLI } = require('./cli');
const { GitHubUtils } = require('./utils/github');

/**
 * Main GitHub Action execution function
 */
async function run() {
  try {
    // Get action inputs
    const inputs = {
      path: core.getInput('path') || '.',
      mode: core.getInput('mode') || 'clean',
      configFile: core.getInput('config-file') || '.emoji-linter.config.json',
      commentPR: core.getInput('comment-pr') === 'true',
      failOnError: core.getInput('fail-on-error') === 'true'
    };

    core.info('Emoji Linter GitHub Action starting...');
    core.info(`Scanning path: ${inputs.path}`);
    core.info(`Using config: ${inputs.configFile}`);
    core.info(`Mode: ${inputs.mode}`);

    // Validate inputs
    try {
      GitHubUtils.validateInputs(inputs);
    } catch (validationError) {
      core.setFailed(validationError.message);
      return;
    }

    // Create CLI instance and execute scan
    const cli = new CLI();
    let results;

    try {
      results = await cli.runAndGetResults(['check', inputs.path], {
        config: inputs.configFile,
        format: 'json',
        quiet: true
      });
    } catch (cliError) {
      core.setFailed(`Action failed: ${cliError.message}`);
      return;
    }

    // Handle CLI execution results
    if (!results.success && results.error) {
      core.setFailed(results.error);
      return;
    }

    // Set action outputs
    const hasEmojis = results.summary.totalEmojis > 0;
    core.setOutput('has-emojis', hasEmojis.toString());
    core.setOutput('emoji-count', results.summary.totalEmojis.toString());
    core.setOutput('files-with-emojis', results.summary.filesWithEmojis.toString());
    core.setOutput('total-files', results.summary.totalFiles.toString());
    core.setOutput('results', JSON.stringify(results.results));

    // Log summary
    core.info(`Scanned ${results.summary.totalFiles} files`);
    core.info(`Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files`);

    // Post PR comment if requested and applicable
    if (inputs.commentPR && GitHubUtils.isPullRequest(github.context)) {
      try {
        const prNumber = GitHubUtils.getPRNumber(github.context);
        if (prNumber) {
          const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
          if (token && token.trim() !== '') {
            const githubUtils = new GitHubUtils(token);
            const report = GitHubUtils.formatEmojiReport(results.results, results.summary, inputs.mode);
            
            await githubUtils.postPRComment(prNumber, report);
            core.info(`Posted PR comment to #${prNumber}`);
          } else {
            core.warning('GitHub token not provided, cannot post PR comment');
          }
        }
      } catch (commentError) {
        // Log error but don't fail the action for comment issues
        core.error(`Failed to post PR comment: ${commentError.message}`);
      }
    }

    // Determine if action should fail based on mode and results
    let shouldFail = false;
    let failureMessage = '';

    if (inputs.failOnError) {
      switch (inputs.mode) {
      case 'clean':
        if (hasEmojis) {
          shouldFail = true;
          failureMessage = `Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files. Mode: clean - emojis should be removed.`;
        }
        break;
      case 'forbid':
        if (hasEmojis) {
          shouldFail = true;
          failureMessage = `Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files. Mode: forbid - emojis are not allowed.`;
        }
        break;
      }
    }

    if (shouldFail) {
      core.setFailed(failureMessage);
      return;
    }

    // Log success message
    switch (inputs.mode) {
    case 'clean':
      if (hasEmojis) {
        core.warning(`Found ${results.summary.totalEmojis} emojis that could be cleaned up`);
      } else {
        core.info('No emojis found - codebase is clean');
      }
      break;
    case 'forbid':
      if (hasEmojis) {
        core.warning(`Found ${results.summary.totalEmojis} forbidden emojis`);
      } else {
        core.info('No forbidden emojis found - validation passed');
      }
      break;
    }

    core.info('Emoji Linter GitHub Action completed successfully');

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

// Export for testing
module.exports = {
  run
};