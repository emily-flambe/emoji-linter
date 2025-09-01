/**
 * Entry point for the emoji-linter GitHub Action
 * This file will be built using @vercel/ncc for distribution
 */

const { run } = require('./action');

// Run the action if this file is executed directly
if (require.main === module) {
  run();
}

module.exports = { run };