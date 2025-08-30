#!/usr/bin/env node

/**
 * Emoji Linter CLI Executable
 * Command-line interface for detecting and managing emoji usage in codebases
 */

/* eslint-disable no-console */

'use strict';

const path = require('path');

try {
  // Import and run the CLI
  const { CLI } = require(path.join(__dirname, '..', 'src', 'cli'));
  
  // Create CLI instance and run
  const cli = new CLI();
  cli.run().catch(error => {
    console.error('Unexpected error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
  
} catch (error) {
  console.error('Failed to start emoji-linter:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}