/* eslint-disable no-unused-vars */

/**
 * Googleカレンダー「日本の祝日」にイベントがあれば祝日と判定
 *
 * https://qiita.com/nakaaza/items/b81be1fe16839369a6ee
 * https://qiita.com/jz4o/items/d4e978f9085129155ca6
 * https://qiita.com/Panda_Program/items/31f331fd4c2f3cfab333
 */
function isPublicHoliday(date: Date) {
  const calendars = CalendarApp.getCalendarsByName('日本の祝日');
  const events = calendars[0].getEventsForDay(date);
  return events.length > 0;
}

/**
 * 土曜日, 日曜日, 祝日であればtrue
 */
function isHoliday(date: Date) {
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return dayOfWeek === '土' || dayOfWeek === '日' || isPublicHoliday(date);
}
