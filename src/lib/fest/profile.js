/**
 * The participant profile: the details required before the fest pass (payment)
 * opens. The database rules (firestore.rules → complete()) check the same thing
 * on every save, so keep the two in step.
 */
export const REQUIRED_PROFILE_FIELDS = [
  'name',
  'gender',
  'dob',
  'phone',
  'college',
  'department',
  'course',
  'year',
  'collegeId',
  'city',
  'state',
  'emergencyName',
  'emergencyPhone',
];

const filled = (v) => typeof v === 'string' && /[^ ]/.test(v);

/** True when every required detail is filled in and the terms are accepted. */
export const isProfileComplete = (p = {}) => Boolean(p) && REQUIRED_PROFILE_FIELDS.every((k) => filled(p[k])) && p.agree === true;
