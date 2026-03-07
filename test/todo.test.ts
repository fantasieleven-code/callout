import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { addTodo, updateTodo, loadTodos, formatTodoList, formatTodoSummary } from '../src/todo.js';

const TEST_DIR = '/tmp/callout-todo-test';

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('todo', () => {
  it('starts with empty list', () => {
    const todos = loadTodos(TEST_DIR);
    expect(todos.items).toEqual([]);
    expect(todos.nextId).toBe(1);
  });

  it('adds items with incrementing ids', () => {
    const item1 = addTodo(TEST_DIR, 'Fix JWT', 'Add orgId to JWT', 'must', 'Security review');
    const item2 = addTodo(TEST_DIR, 'Add tests', 'Core flow tests', 'should', 'CTO review');

    expect(item1.id).toBe(1);
    expect(item2.id).toBe(2);
    expect(item1.priority).toBe('must');
    expect(item1.source).toBe('Security review');
    expect(item1.status).toBe('open');
  });

  it('persists across loads', () => {
    addTodo(TEST_DIR, 'Task 1', '', 'must', 'user');
    addTodo(TEST_DIR, 'Task 2', '', 'nice', 'guide');

    const todos = loadTodos(TEST_DIR);
    expect(todos.items).toHaveLength(2);
    expect(todos.nextId).toBe(3);
  });

  it('updates item status', () => {
    addTodo(TEST_DIR, 'Fix bug', '', 'must', 'user');
    const updated = updateTodo(TEST_DIR, 1, { status: 'done' });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('done');

    const todos = loadTodos(TEST_DIR);
    expect(todos.items[0].status).toBe('done');
  });

  it('returns null for non-existent id', () => {
    const result = updateTodo(TEST_DIR, 999, { status: 'done' });
    expect(result).toBeNull();
  });

  it('formats todo list with priority sorting', () => {
    addTodo(TEST_DIR, 'Nice thing', '', 'nice', 'user');
    addTodo(TEST_DIR, 'Must fix', '', 'must', 'Security');
    addTodo(TEST_DIR, 'Should do', '', 'should', 'CTO');

    const todos = loadTodos(TEST_DIR);
    const output = formatTodoList(todos);

    const mustPos = output.indexOf('Must fix');
    const shouldPos = output.indexOf('Should do');
    const nicePos = output.indexOf('Nice thing');

    expect(mustPos).toBeLessThan(shouldPos);
    expect(shouldPos).toBeLessThan(nicePos);
  });

  it('filters by status', () => {
    addTodo(TEST_DIR, 'Open task', '', 'must', 'user');
    addTodo(TEST_DIR, 'Done task', '', 'must', 'user');
    updateTodo(TEST_DIR, 2, { status: 'done' });

    const todos = loadTodos(TEST_DIR);
    const openOnly = formatTodoList(todos, { status: 'open' });

    expect(openOnly).toContain('Open task');
    expect(openOnly).not.toContain('Done task');
  });

  it('formats summary with counts', () => {
    addTodo(TEST_DIR, 'Must 1', '', 'must', 'CTO');
    addTodo(TEST_DIR, 'Must 2', '', 'must', 'Security');
    addTodo(TEST_DIR, 'Should 1', '', 'should', 'Product');
    updateTodo(TEST_DIR, 3, { status: 'done' });

    const summary = formatTodoSummary(TEST_DIR);
    expect(summary).toContain('Open: 2');
    expect(summary).toContain('Completed: 1');
    expect(summary).toContain('Must 1');
    expect(summary).toContain('Must 2');
  });

  it('shows empty message when no todos', () => {
    const summary = formatTodoSummary(TEST_DIR);
    expect(summary).toContain('No todos yet');
  });
});
