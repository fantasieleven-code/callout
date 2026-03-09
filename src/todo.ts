import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export type Priority = 'must' | 'should' | 'nice';
export type TodoStatus = 'open' | 'in_progress' | 'done' | 'wont_do';

const TodoItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['must', 'should', 'nice']),
  status: z.enum(['open', 'in_progress', 'done', 'wont_do']),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TodoListSchema = z.object({
  nextId: z.number(),
  items: z.array(TodoItemSchema),
});

export interface TodoItem {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: TodoStatus;
  source: string;       // which perspective/tool created this
  createdAt: string;
  updatedAt: string;
}

export interface TodoList {
  nextId: number;
  items: TodoItem[];
}

function todoPath(cwd: string): string {
  return join(cwd, '.callout', 'todo.json');
}

export function loadTodos(cwd: string): TodoList {
  const path = todoPath(cwd);
  if (!existsSync(path)) {
    return { nextId: 1, items: [] };
  }
  try {
    const parsed = TodoListSchema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : { nextId: 1, items: [] };
  } catch {
    return { nextId: 1, items: [] };
  }
}

function saveTodos(cwd: string, todos: TodoList): void {
  const dir = join(cwd, '.callout');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(todoPath(cwd), JSON.stringify(todos, null, 2) + '\n');
}

const MAX_TODO_ITEMS = 500;

export function addTodo(
  cwd: string,
  title: string,
  description: string,
  priority: Priority,
  source: string,
): TodoItem {
  const todos = loadTodos(cwd);

  const activeItems = todos.items.filter(t => t.status !== 'done' && t.status !== 'wont_do');
  if (activeItems.length >= MAX_TODO_ITEMS) {
    throw new Error(`Todo list has ${activeItems.length} active items (limit: ${MAX_TODO_ITEMS}). Mark some items as done or wont_do before adding more.`);
  }

  const now = new Date().toISOString();

  const item: TodoItem = {
    id: todos.nextId,
    title,
    description,
    priority,
    status: 'open',
    source,
    createdAt: now,
    updatedAt: now,
  };

  todos.items.push(item);
  todos.nextId++;
  saveTodos(cwd, todos);
  return item;
}

export function updateTodo(
  cwd: string,
  id: number,
  updates: Partial<Pick<TodoItem, 'status' | 'title' | 'description' | 'priority'>>,
): TodoItem | null {
  const todos = loadTodos(cwd);
  const item = todos.items.find(t => t.id === id);
  if (!item) return null;

  if (updates.status !== undefined) item.status = updates.status;
  if (updates.title !== undefined) item.title = updates.title;
  if (updates.description !== undefined) item.description = updates.description;
  if (updates.priority !== undefined) item.priority = updates.priority;
  item.updatedAt = new Date().toISOString();

  saveTodos(cwd, todos);
  return item;
}

export function formatTodoList(todos: TodoList, filter?: { status?: TodoStatus; priority?: Priority }): string {
  let items = todos.items;

  if (filter?.status) {
    items = items.filter(t => t.status === filter.status);
  }
  if (filter?.priority) {
    items = items.filter(t => t.priority === filter.priority);
  }

  if (items.length === 0) {
    return 'No items found.';
  }

  // Sort: must > should > nice, then by id
  const priorityOrder: Record<Priority, number> = { must: 0, should: 1, nice: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.id - b.id);

  const priorityIcons: Record<Priority, string> = { must: 'MUST', should: 'SHOULD', nice: 'NICE' };
  const statusIcons: Record<TodoStatus, string> = {
    open: '[ ]',
    in_progress: '[~]',
    done: '[x]',
    wont_do: '[-]',
  };

  const lines = [`# Todo List (${items.length} items)`, ''];

  // Summary counts
  const open = todos.items.filter(t => t.status === 'open').length;
  const inProgress = todos.items.filter(t => t.status === 'in_progress').length;
  const done = todos.items.filter(t => t.status === 'done').length;
  const wontDo = todos.items.filter(t => t.status === 'wont_do').length;
  lines.push(`Open: ${open} | In Progress: ${inProgress} | Done: ${done} | Won't Do: ${wontDo}`, '');

  const mustCount = todos.items.filter(t => t.priority === 'must' && t.status !== 'done' && t.status !== 'wont_do').length;
  if (mustCount > 0) {
    lines.push(`**${mustCount} MUST items still open**`, '');
  }

  lines.push('---', '');

  for (const item of items) {
    lines.push(`${statusIcons[item.status]} #${item.id} [${priorityIcons[item.priority]}] ${item.title}`);
    if (item.description) {
      lines.push(`   ${item.description}`);
    }
    lines.push(`   Source: ${item.source} | ${item.updatedAt.split('T')[0]}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatTodoSummary(cwd: string): string {
  const todos = loadTodos(cwd);

  if (todos.items.length === 0) {
    return 'No todos yet. Run `review` or `coach` to discover items, or use `todo_add` to add your own.';
  }

  const open = todos.items.filter(t => t.status === 'open');
  const inProgress = todos.items.filter(t => t.status === 'in_progress');
  const done = todos.items.filter(t => t.status === 'done');

  const mustOpen = open.filter(t => t.priority === 'must');

  const lines = [
    `## Project Health: ${todos.items.length} total items`,
    '',
    `- Open: ${open.length} (${mustOpen.length} MUST)`,
    `- In Progress: ${inProgress.length}`,
    `- Completed: ${done.length}`,
    '',
  ];

  if (mustOpen.length > 0) {
    lines.push('### Top Priority (MUST, open):', '');
    for (const item of mustOpen.slice(0, 5)) {
      lines.push(`- #${item.id}: ${item.title} (from ${item.source})`);
    }
    lines.push('');
  }

  if (inProgress.length > 0) {
    lines.push('### Currently Working On:', '');
    for (const item of inProgress) {
      lines.push(`- #${item.id}: ${item.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
