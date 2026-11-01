import { EVENT_SCHEDULE } from './schedule';

/**
 * When each event runs, for the registration clash check: event slug → its time
 * slots [{ day: 1 | 2, start: 'HH:MM', end: 'HH:MM' }]. Read straight from the
 * schedule (config/schedule.js), so it is always in step with it.
 */
export const EVENT_SLOTS = EVENT_SCHEDULE;
