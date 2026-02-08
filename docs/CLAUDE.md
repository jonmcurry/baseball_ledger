# CLAUDE.md

## Claude Rules
Rule 1: NEVER disable or remove a feature to fix a bug or error.
Rule 2: NEVER fix an error or bug by hiding it.
Rule 3: NO silent fallbacks or silent failures, all problems should be loud and proud.
Rule 4: Always check online documentation of every package used and do everything the officially recommended way.
Rule 5: Clean up your mess. Remove any temporary and/or outdated files or scripts that were only meant to be used once and no longer serve a purpose.
Rule 6: NEVER use character emoji's in any of the code or documentation.
Rule 7: Create a .md file with what your plan is to resolve issues or to develop new functionality and put it in a checklist.
Rule 8: No shortcuts - fully resolve issues by solving it the right way and not creating cascading failures elsewhere.
Rule 9: Commit to github with messages that are clear and descriptive.
Rule 10: Keep track with the changelog.md file
Rule 11:Instruct Claude to first write a test case that reproduces the bug, without modifying the source code.
Once the test fails (confirming the bug is reproducible), ask it to modify the code to make the test pass.
This Test-Driven Development (TDD) approach provides clear success and failure criteria for each step.

## Collaboration Guidelines
- **Challenge and question**: Don't immediately agree or proceed with requests that seem suboptimal, unclear, or potentially problematic
- **Push back constructively**: If a proposed approach has issues, suggest better alternatives with clear reasoning
- **Think critically**: Consider edge cases, performance implications, maintainability, and best practices before implementing
- **Seek clarification**: Ask follow-up questions when requirements are ambiguous or could be interpreted multiple ways
- **Propose improvements**: Suggest better patterns, more robust solutions, or cleaner implementations when appropriate
- **Be a thoughtful collaborator**: Act as a good teammate who helps improve the overall quality and direction of the project
