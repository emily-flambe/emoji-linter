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
      mode: core.getInput('mode') || 'check',
      configFile: core.getInput('config-file') || '.emoji-linter.config.json',
      commentPR: core.getInput('comment-pr') === 'true',
      failOnError: core.getInput('fail-on-error') === 'true',
      showFiles: core.getInput('show-files') === 'true'
    };

    core.info('Emoji Linter GitHub Action starting...');
    core.info(`Current working directory: ${process.cwd()}`);
    core.info(`Scanning path: ${inputs.path}`);
    core.info(`Using config: ${inputs.configFile}`);
    core.info(`Mode: ${inputs.mode}`);
    core.info(`Show files: ${inputs.showFiles}`);

    // Validate inputs
    try {
      GitHubUtils.validateInputs(inputs);
    } catch (validationError) {
      core.setFailed(validationError.message);
      return;
    }

    // Create CLI instance with the config file path
    core.info(`Creating CLI with config file: ${inputs.configFile}`);
    const cli = new CLI(inputs.configFile);
    let results;

    try {
      // Mode directly maps to CLI command: 'check' or 'fix'
      results = await cli.runAndGetResults([inputs.mode, inputs.path], {
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
    
    // Show files with emojis if requested
    if (inputs.showFiles && results.summary.filesWithEmojis > 0) {
      core.info('');
      core.info('Files containing emojis:');
      const filesWithEmojis = results.results.filter(result => 
        result.emojis && result.emojis.length > 0
      );
      filesWithEmojis.forEach(file => {
        core.info(`  ${file.filePath} (${file.emojis.length} emoji${file.emojis.length > 1 ? 's' : ''})`);
      });
      core.info('');
    }

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
    if (inputs.mode === 'check' && hasEmojis && inputs.failOnError) {
      const failureMessage = `Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files. Mode: check - emojis are not allowed.`;
      core.setFailed(failureMessage);
      return;
    }
    
    // For 'fix' mode, check if the operation actually succeeded
    if (inputs.mode === 'fix' && !results.success) {
      core.setFailed(`Failed to fix emojis: ${results.error || 'Unknown error'}`);
      return;
    }

    // Log success message
    switch (inputs.mode) {
    case 'check':
      if (hasEmojis) {
        core.warning(`Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files`);
      } else {
        core.info('No emojis found - validation passed');
      }
      break;
    case 'fix':
      if (results.summary && results.summary.fixedFiles > 0) {
        core.info(`Fixed ${results.summary.fixedFiles} files, removed ${results.summary.totalEmojis} emojis`);
      } else if (hasEmojis) {
        core.warning(`Found ${results.summary.totalEmojis} emojis but no files were modified`);
      } else {
        core.info('No emojis found to remove');
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