import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { collectContext } from '../context.js';
import { detectScenes, buildRecommendPrompt } from '../prompts/recommend.js';
import { filterDismissed, dismissScene, loadDismissed, resetDismissed } from '../recommend.js';
import { resolvePath, withPathHeader } from '../util.js';
import type { Scene } from '../prompts/recommend.js';

export function registerRecommendTools(server: McpServer): void {
  server.tool(
    'recommend',
    'Detect what the project needs and recommend the best tool/service for each scenario. Recommends auth, database, payments, deployment tools etc. based on current task and existing dependencies. Same scenario is not recommended twice.',
    {
      task: z
        .string()
        .optional()
        .describe('What the user is currently working on or about to build. E.g. "add user login" or "set up payments".'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ task, project_path }) => {
      const cwd = resolvePath(project_path);

      try {
        const context = await collectContext(cwd);
        const allScenes = detectScenes(context, task);
        const scenes = filterDismissed(cwd, allScenes);

        if (scenes.length === 0) {
          const msg = allScenes.length > 0
            ? `All detected scenarios (${allScenes.join(', ')}) have already been recommended. No new recommendations.`
            : 'No tool recommendation scenarios detected for the current task and project state.';
          return {
            content: [{ type: 'text' as const, text: msg }],
          };
        }

        const prompt = buildRecommendPrompt(context, scenes, task);
        const sceneList = scenes.map((s) => `"${s}"`).join(', ');

        return {
          content: [
            { type: 'text' as const, text: withPathHeader(prompt, cwd) },
            {
              type: 'text' as const,
              text: `\n\n---\n\nAfter the user has seen these recommendations, call \`recommend_dismiss\` for each scenario to avoid repeating: ${sceneList}. If the user says they don't need a particular recommendation, dismiss that scenario too.`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'recommend_dismiss',
    'Dismiss a recommendation scenario so it won\'t be suggested again. Use when the user says they don\'t need a recommendation for a particular area.',
    {
      scene: z
        .string()
        .describe('The scenario to dismiss. E.g. "auth", "database", "payments".'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ scene, project_path }) => {
      const cwd = resolvePath(project_path);
      dismissScene(cwd, scene as Scene);

      return {
        content: [{
          type: 'text' as const,
          text: `Dismissed "${scene}" — this scenario won't be recommended again for this project.`,
        }],
      };
    },
  );

  server.tool(
    'recommend_reset',
    'Reset all dismissed recommendation scenarios. After reset, recommend will detect and suggest tools again for all scenarios. Also shows what was previously dismissed.',
    {
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ project_path }) => {
      const cwd = resolvePath(project_path);
      const dismissed = loadDismissed(cwd);

      if (dismissed.dismissed.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No dismissed scenarios to reset.',
          }],
        };
      }

      const cleared = resetDismissed(cwd);

      return {
        content: [{
          type: 'text' as const,
          text: `Reset ${cleared.length} dismissed scenario(s): ${cleared.join(', ')}. Running \`recommend\` will now detect these again.`,
        }],
      };
    },
  );
}
