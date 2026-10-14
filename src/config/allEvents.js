import { DEPARTMENTS, DEPT_ORDER, eventSlug } from './departments';
import { BODY_BY_KEY } from './experience';
import { CONSTELLATIONS } from './constellations';

/** Every event in the fest, flattened and numbered 01–27, with its department, world and constellation. */
export const ALL_EVENTS = DEPT_ORDER.flatMap((key) =>
  DEPARTMENTS[key].events.map((e) => ({
    ...e,
    slug: eventSlug(e.name),
    dept: key,
    deptName: DEPARTMENTS[key].name,
    world: key === 'moon' ? 'The Moon' : key === 'station' ? 'The Space Station' : BODY_BY_KEY[key].name,
    solo: /individual/i.test(e.format),
  })),
).map((e, i) => ({ ...e, no: i + 1, constellation: CONSTELLATIONS[i % CONSTELLATIONS.length] }));
