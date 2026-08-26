# ZAYRON-X AI Tooling Setup

This repository uses a Cloudflare-first and model-safe tooling setup.

## Recommended free baseline

1. Visual Studio Code
2. GitHub Copilot free tier
3. Cloudflare Skills
4. Cloudflare MCP servers
5. Figma MCP server

Cloudflare's official agent setup docs describe VS Code + GitHub Copilot as the baseline editor flow, and Cloudflare's MCP servers as the account-aware automation layer for Cloudflare services. Figma's MCP server adds structured design context for front-end generation.

## Why this is the right fit

- VS Code gives the project a consistent workspace and extension model.
- GitHub Copilot provides code completion and chat assistance inside the editor.
- Cloudflare Skills provide Cloudflare-specific prompts and workflows.
- Cloudflare MCP servers let connected agents inspect and operate Cloudflare resources with proper authorization.
- Figma MCP server gives the agent access to design context, tokens, and component intent so front-end output stays aligned with a real design system.

## What was linked in this repo

- `.vscode/extensions.json` to recommend the editor extensions.
- `.vscode/settings.json` to keep the workspace consistent.
- `AGENTS.md` to keep AI behavior governed by the master spec.

## Verification rule

Do not trust any single AI response or any single successful action. Verify important changes:
- by reading the modified files,
- by running typecheck/build where relevant,
- and by checking the runtime or Cloudflare configuration separately.

## Cloudflare-specific note

This setup does not replace Cloudflare access or Cloudflare secrets. It only improves the local developer and agent workflow around the Cloudflare-native project.

## Best-practice stack for this repository

For this project, the strongest practical workflow is:
- VS Code as the editor
- GitHub Copilot for day-to-day coding help
- Figma MCP server for design-informed UI generation
- Cloudflare Skills for Cloudflare-specific reasoning
- Cloudflare MCP servers for infrastructure, logs, and account-aware operations

This combination is better than relying on a single extension because it separates:
- design context
- code generation
- platform governance
- infrastructure verification
