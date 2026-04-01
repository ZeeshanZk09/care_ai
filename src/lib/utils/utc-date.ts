/**
 * Returns the start of the month in UTC for the provided date.
 */
export const getUtcMonthStart = (date = new Date()): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
};

/**
 * Returns the Monday week start in UTC, with optional week offset.
 */
export const getUtcWeekStart = (date = new Date(), weeksAgo = 0): Date => {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diffToMonday - weeksAgo * 7);
  utc.setUTCHours(0, 0, 0, 0);

  return utc;
};