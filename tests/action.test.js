/**
 * Tests for GitHub Action wrapper
 */

const core = require('@actions/core');
const github = require('@actions/github');
const { run } = require('../src/action');
const { CLI } = require('../src/cli');
const { GitHubUtils } = require('../src/utils/github');

// Mock dependencies
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../src/cli');
jest.mock('../src/utils/github');

describe('GitHub Action', () => {
  let mockSetOutput;
  let mockSetFailed;
  let mockInfo;
  let mockError;
  let mockGetInput;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup core mocks
    mockSetOutput = jest.fn();
    mockSetFailed = jest.fn();
    mockInfo = jest.fn();
    mockError = jest.fn();
    mockGetInput = jest.fn();

    core.setOutput = mockSetOutput;
    core.setFailed = mockSetFailed;
    core.info = mockInfo;
    core.error = mockError;
    core.getInput = mockGetInput;

    // Setup GitHub context mock
    github.context = {
      eventName: 'push',
      payload: {
        repository: {
          name: 'test-repo',
          owner: { login: 'test-user' }
        }
      },
      repo: {
        owner: 'test-user',
        repo: 'test-repo'
      },
      sha: 'abc123'
    };

    // Setup default CLI mock
    CLI.mockImplementation(() => ({
      runAndGetResults: jest.fn().mockResolvedValue({
        success: true,
        results: [],
        summary: {
          totalFiles: 0,
          filesWithEmojis: 0,
          totalEmojis: 0,
          errors: []
        }
      })
    }));

    // Setup default GitHubUtils mock
    GitHubUtils.mockImplementation(() => ({}));
    GitHubUtils.validateInputs = jest.fn();
    GitHubUtils.formatEmojiReport = jest.fn().mockReturnValue('Mock report');
    GitHubUtils.isPullRequest = jest.fn().mockReturnValue(false);
    GitHubUtils.getPRNumber = jest.fn().mockReturnValue(null);
  });

  describe('Input Validation', () => {
    it('should validate mode input correctly', async () => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': '.',
          'mode': 'invalid-mode',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'true',
          'fail-on-error': 'true'
        };
        return inputs[name] || '';
      });

      // Mock the validation to throw the expected error
      GitHubUtils.validateInputs.mockImplementation(() => {
        throw new Error('Invalid mode: invalid-mode. Valid modes: clean, forbid');
      });

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Invalid mode: invalid-mode. Valid modes: clean, forbid')
      );
    });

    it('should accept valid mode values', async () => {
      const validModes = ['clean', 'forbid'];
      
      for (const mode of validModes) {
        jest.clearAllMocks();
        
        mockGetInput.mockImplementation((name) => {
          const inputs = {
            'path': '.',
            'mode': mode,
            'config-file': '.emoji-linter.json',
            'comment-pr': 'false',
            'fail-on-error': 'false'
          };
          return inputs[name] || '';
        });

        // Mock CLI runAndGetResults to return success
        CLI.mockImplementation(() => ({
          runAndGetResults: jest.fn().mockResolvedValue({
            success: true,
            results: [],
            summary: {
              totalFiles: 0,
              filesWithEmojis: 0,
              totalEmojis: 0,
              errors: []
            }
          })
        }));

        await run();

        expect(mockSetFailed).not.toHaveBeenCalled();
      }
    });

    it('should use default values for optional inputs', async () => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': '',
          'mode': 'clean',
          'config-file': '',
          'comment-pr': '',
          'fail-on-error': ''
        };
        return inputs[name] || '';
      });

      // Mock CLI runAndGetResults
      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue({
          success: true,
          results: [],
          summary: {
            totalFiles: 0,
            filesWithEmojis: 0,
            totalEmojis: 0,
            errors: []
          }
        })
      }));

      await run();

      expect(mockInfo).toHaveBeenCalledWith('Scanning path: .');
      expect(mockInfo).toHaveBeenCalledWith('Using config: .emoji-linter.json');
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('Mode Execution', () => {
    beforeEach(() => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'clean',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'false',
          'fail-on-error': 'true'
        };
        return inputs[name] || '';
      });
    });

    it('should execute clean mode successfully', async () => {
      const mockResults = {
        success: true,
        results: [
          {
            filePath: './src/test.js',
            emojis: [],
            size: 100
          }
        ],
        summary: {
          totalFiles: 1,
          filesWithEmojis: 0,
          totalEmojis: 0,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith('has-emojis', 'false');
      expect(mockSetOutput).toHaveBeenCalledWith('emoji-count', '0');
      expect(mockSetOutput).toHaveBeenCalledWith('files-with-emojis', '0');
      expect(mockSetOutput).toHaveBeenCalledWith('total-files', '1');
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle forbid mode when emojis are found', async () => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'forbid',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'false',
          'fail-on-error': 'true'
        };
        return inputs[name] || '';
      });

      const mockResults = {
        success: true,
        results: [
          {
            filePath: './src/test.js',
            emojis: [
              { emoji: '👍', type: 'unicode', lineNumber: 1, columnNumber: 5 }
            ],
            size: 100
          }
        ],
        summary: {
          totalFiles: 1,
          filesWithEmojis: 1,
          totalEmojis: 1,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith('has-emojis', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('emoji-count', '1');
      expect(mockSetFailed).toHaveBeenCalledWith('Found 1 emojis in 1 files. Mode: forbid - emojis are not allowed.');
    });
  });

  describe('PR Comments', () => {
    beforeEach(() => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'clean',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'true',
          'fail-on-error': 'false'
        };
        return inputs[name] || '';
      });

      github.context = {
        eventName: 'pull_request',
        payload: {
          pull_request: { number: 123 },
          repository: {
            name: 'test-repo',
            owner: { login: 'test-user' }
          }
        },
        repo: {
          owner: 'test-user',
          repo: 'test-repo'
        },
        sha: 'abc123'
      };
    });

    it('should post PR comment when emojis are found', async () => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'clean',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'true',
          'fail-on-error': 'false',
          'github-token': 'fake-token'
        };
        return inputs[name] || '';
      });

      const mockResults = {
        success: true,
        results: [
          {
            filePath: './src/test.js',
            emojis: [
              { emoji: '👍', type: 'unicode', lineNumber: 1, columnNumber: 5 }
            ],
            size: 100
          }
        ],
        summary: {
          totalFiles: 1,
          filesWithEmojis: 1,
          totalEmojis: 1,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      const mockPostComment = jest.fn().mockResolvedValue({});
      GitHubUtils.mockImplementation(() => ({
        postPRComment: mockPostComment
      }));
      GitHubUtils.isPullRequest.mockReturnValue(true);
      GitHubUtils.getPRNumber.mockReturnValue(123);
      GitHubUtils.formatEmojiReport.mockReturnValue('Found 1 emojis in 1 files');

      await run();

      expect(mockPostComment).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Found 1 emojis in 1 files')
      );
    });

    it('should not post PR comment for non-PR events', async () => {
      github.context = {
        eventName: 'push',
        payload: {
          repository: {
            name: 'test-repo',
            owner: { login: 'test-user' }
          }
        },
        repo: {
          owner: 'test-user',
          repo: 'test-repo'
        },
        sha: 'abc123'
      };

      const mockResults = {
        success: true,
        results: [],
        summary: {
          totalFiles: 0,
          filesWithEmojis: 0,
          totalEmojis: 0,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      const mockPostComment = jest.fn();
      GitHubUtils.mockImplementation(() => ({
        postPRComment: mockPostComment
      }));

      await run();

      expect(mockPostComment).not.toHaveBeenCalled();
    });

    it('should handle PR comment posting errors gracefully', async () => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'clean',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'true',
          'fail-on-error': 'false',
          'github-token': 'fake-token'
        };
        return inputs[name] || '';
      });

      const mockResults = {
        success: true,
        results: [
          {
            filePath: './src/test.js',
            emojis: [
              { emoji: '👍', type: 'unicode', lineNumber: 1, columnNumber: 5 }
            ],
            size: 100
          }
        ],
        summary: {
          totalFiles: 1,
          filesWithEmojis: 1,
          totalEmojis: 1,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      const mockPostComment = jest.fn().mockRejectedValue(new Error('GitHub API error'));
      GitHubUtils.mockImplementation(() => ({
        postPRComment: mockPostComment
      }));
      GitHubUtils.isPullRequest.mockReturnValue(true);
      GitHubUtils.getPRNumber.mockReturnValue(123);
      GitHubUtils.formatEmojiReport.mockReturnValue('Found 1 emojis in 1 files');

      await run();

      expect(mockError).toHaveBeenCalledWith('Failed to post PR comment: GitHub API error');
      expect(mockSetFailed).not.toHaveBeenCalled(); // Should not fail the action
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'clean',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'false',
          'fail-on-error': 'true'
        };
        return inputs[name] || '';
      });
    });

    it('should handle CLI execution errors', async () => {
      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockRejectedValue(new Error('CLI execution failed'))
      }));

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('Action failed: CLI execution failed');
    });

    it('should handle invalid configuration errors', async () => {
      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid configuration file',
          results: [],
          summary: {
            totalFiles: 0,
            filesWithEmojis: 0,
            totalEmojis: 0,
            errors: ['Invalid configuration file']
          }
        })
      }));

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('Invalid configuration file');
    });

    it('should not fail when fail-on-error is false', async () => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'forbid',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'false',
          'fail-on-error': 'false'
        };
        return inputs[name] || '';
      });

      const mockResults = {
        success: true,
        results: [
          {
            filePath: './src/test.js',
            emojis: [
              { emoji: '👍', type: 'unicode', lineNumber: 1, columnNumber: 5 }
            ],
            size: 100
          }
        ],
        summary: {
          totalFiles: 1,
          filesWithEmojis: 1,
          totalEmojis: 1,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith('has-emojis', 'true');
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('Output Generation', () => {
    beforeEach(() => {
      mockGetInput.mockImplementation((name) => {
        const inputs = {
          'path': './src',
          'mode': 'clean',
          'config-file': '.emoji-linter.json',
          'comment-pr': 'false',
          'fail-on-error': 'false'
        };
        return inputs[name] || '';
      });
    });

    it('should set all required outputs', async () => {
      const mockResults = {
        success: true,
        results: [
          {
            filePath: './src/test.js',
            emojis: [
              { emoji: '👍', type: 'unicode', lineNumber: 1, columnNumber: 5 },
              { emoji: '🎉', type: 'unicode', lineNumber: 2, columnNumber: 10 }
            ],
            size: 100
          },
          {
            filePath: './src/other.js',
            emojis: [],
            size: 50
          }
        ],
        summary: {
          totalFiles: 2,
          filesWithEmojis: 1,
          totalEmojis: 2,
          errors: []
        }
      };

      CLI.mockImplementation(() => ({
        runAndGetResults: jest.fn().mockResolvedValue(mockResults)
      }));

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith('has-emojis', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('emoji-count', '2');
      expect(mockSetOutput).toHaveBeenCalledWith('files-with-emojis', '1');
      expect(mockSetOutput).toHaveBeenCalledWith('total-files', '2');
      expect(mockSetOutput).toHaveBeenCalledWith('results', JSON.stringify(mockResults.results));
    });
  });
});