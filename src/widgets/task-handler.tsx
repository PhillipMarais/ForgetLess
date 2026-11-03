import type { WidgetTaskHandler } from 'react-native-android-widget';

import { loadSettings } from '@/db/settings';
import { reopenOccurrence, setTaskCompleted } from '@/db/tasks';
import { scheduleAlarms } from '@/hooks/use-alarm-sync';

import { refreshWidgets } from './widget-sync';
import { renderWidgetByName, setCalendarOffset, widgetDatabase } from './widget-render';
import type { CalendarMonthData, ToggleTaskData } from './widgets';

/**
 * Runs when a widget is added, resized, due for its periodic update, or tapped. Taps on a
 * task's circle tick it off (or back on) here, without opening the app, and the calendar's
 * arrows page through months.
 */
export const widgetTaskHandler: WidgetTaskHandler = async ({
  widgetInfo,
  widgetAction,
  clickAction,
  clickActionData,
  renderWidget,
}) => {
  if (widgetAction === 'WIDGET_DELETED') return;
  const db = await widgetDatabase();
  const settings = await loadSettings(db);

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE_TASK') {
    const task = clickActionData as unknown as ToggleTaskData;
    if (task.occurrence === 'done' && task.dueAt !== null) await reopenOccurrence(db, task.id, task.dueAt);
    else await setTaskCompleted(db, task.id, !task.done);
    // The task's alarms change with it; other widgets show it too.
    await scheduleAlarms(db, settings).catch(() => {});
    await refreshWidgets(db, settings, widgetInfo.widgetName);
  }

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'CALENDAR_MONTH') {
    setCalendarOffset(widgetInfo.widgetId, (clickActionData as unknown as CalendarMonthData).offset);
  }

  renderWidget(await renderWidgetByName(widgetInfo.widgetName, widgetInfo, db, settings));
};
