import AppTabs from '@/components/app-tabs';
import { useAlarmSync } from '@/hooks/use-alarm-sync';
import { useSkipMissedRepeats } from '@/hooks/use-skip-missed-repeats';
import { useWidgetSync } from '@/widgets/widget-sync';

export default function TabLayout() {
  useSkipMissedRepeats();
  useAlarmSync();
  useWidgetSync();
  return <AppTabs />;
}
