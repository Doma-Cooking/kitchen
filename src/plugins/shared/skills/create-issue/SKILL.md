---
name: create-issue
description: Create an issue using the correct workspace template. Use when asked to create, file, or open an issue.
---

1. Fetch templates (`kitchen-linear get-templates`). If a team is known, filter by `teamId`.
2. Pick the template that best matches the request. Ask the user if ambiguous.
3. Resolve the target team (`kitchen-linear list-teams`) if not already known.
4. Create the issue (`kitchen-linear create-issue`) and report the identifier and URL.
