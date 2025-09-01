# Plan 01: Add LICENSE File (CRITICAL)

## Objective
Add MIT LICENSE file to repository root - **Required for GitHub Marketplace**

## Time Required
**15 minutes**

## Implementation

### Step 1: Create LICENSE file

Create file `/LICENSE` with this exact content:

```
MIT License

Copyright (c) 2024 Emily Cogsdill

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Step 2: Verify

1. Check GitHub recognizes the license (look for "MIT" badge on repo page)
2. Ensure package.json has `"license": "MIT"` (already present)

## Acceptance Criteria

- [ ] LICENSE file exists in repository root
- [ ] Contains standard MIT license text
- [ ] GitHub shows MIT license in repository header

## That's it. Done in 15 minutes.