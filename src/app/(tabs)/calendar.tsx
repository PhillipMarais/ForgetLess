import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { Screen } from '@/components/screen';

export default function CalendarScreen() {
  return (
    <Screen title="Calendar">
      <EmptyState
        icon={Icons.calendar}
        title="Calendar coming next"
        message="Month view and events, including repeating ones, are the next thing to build."
      />
    </Screen>
  );
}
