import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTodo, updateTodo, loadTodos, formatTodoList, formatTodoSummary } from '../todo.js';
import { resolvePath } from '../util.js';
import type { Priority, TodoStatus } from '../todo.js';

export function registerTodoTools(server: McpServer): void {
  server.tool(
    'todo_add',
    'Add an item to the project todo list. All findings from review, challenge, and guide should be added here.',
    {
      title: z.string().describe('Short title of the todo item'),
      description: z.string().optional().describe('Detailed description'),
      priority: z.enum(['must', 'should', 'nice']).describe('Priority: must = blocks launch, should = important improvement, nice = when you have time'),
      source: z.string().optional().describe('Where this item came from (e.g. "CTO review", "Security review", "guide", "user")'),
      project_path: z.string().optional(),
    },
    async ({ title, description, priority, source, project_path }) => {
      const cwd = resolvePath(project_path);
      try {
        const item = addTodo(cwd, title, description || '', priority, source || 'user');
        return {
          content: [{
            type: 'text' as const,
            text: `Added todo #${item.id}: [${priority.toUpperCase()}] ${title}`,
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: message }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'todo_update',
    'Update a todo item status or details.',
    {
      id: z.number().describe('Todo item ID'),
      status: z.enum(['open', 'in_progress', 'done', 'wont_do']).optional().describe('New status'),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(['must', 'should', 'nice']).optional(),
      project_path: z.string().optional(),
    },
    async ({ id, status, title, description, priority, project_path }) => {
      const cwd = resolvePath(project_path);
      const updates: Partial<Pick<import('../todo.js').TodoItem, 'status' | 'title' | 'description' | 'priority'>> = {};
      if (status) updates.status = status as TodoStatus;
      if (title) updates.title = title;
      if (description) updates.description = description;
      if (priority) updates.priority = priority as Priority;

      const item = updateTodo(cwd, id, updates);

      if (!item) {
        return {
          content: [{ type: 'text' as const, text: `Todo #${id} not found.` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Updated todo #${id}: [${item.priority.toUpperCase()}] ${item.title} → ${item.status}`,
        }],
      };
    },
  );

  server.tool(
    'todo_list',
    'Show all todo items, optionally filtered by status or priority.',
    {
      status: z.enum(['open', 'in_progress', 'done', 'wont_do']).optional().describe('Filter by status'),
      priority: z.enum(['must', 'should', 'nice']).optional().describe('Filter by priority'),
      project_path: z.string().optional(),
    },
    async ({ status, priority, project_path }) => {
      const cwd = resolvePath(project_path);
      const todos = loadTodos(cwd);

      return {
        content: [{
          type: 'text' as const,
          text: formatTodoList(todos, {
            status: status as TodoStatus | undefined,
            priority: priority as Priority | undefined,
          }),
        }],
      };
    },
  );

  server.tool(
    'todo_summary',
    'Quick health check: how many items open, in progress, done. Shows top priority items.',
    {
      project_path: z.string().optional(),
    },
    async ({ project_path }) => {
      const cwd = resolvePath(project_path);

      return {
        content: [{
          type: 'text' as const,
          text: formatTodoSummary(cwd),
        }],
      };
    },
  );
}
