import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChoiceDialog } from './choice-dialog';

it('shows the message and a custom cancel label', async () => {
  const onChoose = jest.fn();
  const onCancel = jest.fn();
  await render(
    <ChoiceDialog
      visible
      title="Show holidays?"
      message="Only holiday calendars are read."
      choices={[{ label: 'Continue', value: true }]}
      onChoose={onChoose}
      onCancel={onCancel}
      cancelLabel="Not now"
    />,
  );

  expect(screen.getByText('Only holiday calendars are read.')).toBeTruthy();
  fireEvent.press(screen.getByText('Continue'));
  expect(onChoose).toHaveBeenCalledWith(true);
  fireEvent.press(screen.getByText('Not now'));
  expect(onCancel).toHaveBeenCalled();
});
