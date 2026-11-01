import { ALL_EVENTS } from '../../config/allEvents';
import { EVENT_SLOTS } from '../../config/eventSlots';
import { buildCatalog } from './rules.js';

/**
 * The fest's events as the registration rules see them (team size, fee tier,
 * fee), plus their schedule slots. Built from the same config as the site, so a
 * new event or a format change flows through automatically.
 */
export const CATALOG = buildCatalog(ALL_EVENTS);
export const SLOTS = EVENT_SLOTS;
