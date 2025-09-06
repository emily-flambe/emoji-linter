/**
 * GitHub Action entry point for emoji-linter
 * Simplified interface with only check and fix modes
 */

const core = require('@actions/core');
const { CLI } = require('./cli');

/**
 * Main GitHub Action execution function
 */
async function run() {
  try {
    // Get action inputs
    const inputs = {
      path: core.getInput('path') || '.',
      mode: core.getInput('mode') || 'check'
    };

    core.info('Emoji Linter GitHub Action starting...');
    core.info(`Scanning path: ${inputs.path}`);
    core.info(`Mode: ${inputs.mode}`);

    // Validate mode
    if (!['check', 'fix'].includes(inputs.mode)) {
      core.setFailed(`Invalid mode: ${inputs.mode}. Must be "check" or "fix"`);
      return;
    }

    // Create CLI instance
    const cli = new CLI();
    let results;

    try {
      // Run CLI in JSON format for structured output
      results = await cli.runAndGetResults([inputs.mode, inputs.path], {
        format: 'json'
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

    // Log summary
    core.info(`Scanned ${results.summary.totalFiles} files`);
    core.info(`Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files`);

    // Determine if action should fail based on mode and results
    if (inputs.mode === 'check' && hasEmojis) {
      const failureMessage = `Found ${results.summary.totalEmojis} emojis in ${results.summary.filesWithEmojis} files. Emojis are not allowed.`;
      core.setFailed(failureMessage);
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
      if (results.summary.filesFixed && results.summary.filesFixed > 0) {
        core.info(`Removed ${results.summary.emojisRemoved} emojis from ${results.summary.filesFixed} files`);
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