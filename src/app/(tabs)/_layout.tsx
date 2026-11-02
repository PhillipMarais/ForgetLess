import AppTabs from '@/components/app-tabs';
import { useSkipMissedRepeats } from '@/hooks/use-skip-missed-repeats';

export default function TabLayout() {
  useSkipMissedRepeats();
  return <AppTabs />;
}
