import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { ReactElement } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TaskRow } from './task-row';
import { createTask, listTasks, type Task } from '@/db/tasks';
import { createMigratedTestDatabase } from '@/db/testing/test-database';

let mockDb: SQLiteDatabase;

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

async function addTask(input: Parameters<typeof createTask>[1]): Promise<Task> {
  const id = await createTask(mockDb, input);
  return (await listTasks(mockDb)).find((task) => task.id === id)!;
}

/** Rows can be swiped, so they need the gesture root the app wraps everything in. */
const renderRow = (row: ReactElement) => render(<GestureHandlerRootView>{row}</GestureHandlerRootView>);

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
});

it('shows the title and due label', async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const task = await addTask({ title: 'Buy milk', dueAt: today.getTime(), dueAllDay: true });

  await renderRow(<TaskRow task={task} />);

  expect(screen.getByText('Buy milk')).toBeTruthy();
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked();
});

it('marks the task complete when the checkbox is pressed', async () => {
  const task = await addTask({ title: 'Call plumber' });
  await renderRow(<TaskRow task={task} />);

  await fireEvent.press(screen.getByRole('checkbox', { name: 'Call plumber' }));

  await waitFor(async () => {
    expect((await listTasks(mockDb))[0].completedAt).not.toBeNull();
  });
});

it('asks before deleting, and deletes only once confirmed', async () => {
  const task = await addTask({ title: 'Temporary' });
  await renderRow(<TaskRow task={task} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete Temporary' }));
  expect(await listTasks(mockDb)).toHaveLength(1);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  await waitFor(async () => {
    expect(await listTasks(mockDb)).toEqual([]);
  });
});

it('keeps the task when the delete is cancelled', async () => {
  const task = await addTask({ title: 'Keep me' });
  await renderRow(<TaskRow task={task} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Delete Keep me' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByRole('button', { name: 'Delete task' })).toBeNull();
  expect(await listTasks(mockDb)).toHaveLength(1);
});

it('opens the task editor when the title is pressed', async () => {
  const task = await addTask({ title: 'Plan trip' });
  await renderRow(<TaskRow task={task} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Edit Plan trip' }));

  expect(router.push).toHaveBeenCalledWith({ pathname: '/task/[id]', params: { id: task.id } });
});
