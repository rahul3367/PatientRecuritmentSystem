/**
 * Calculates current age based on DOB string (YYYY-MM-DD) or Date object,
 * correctly accounting for whether the birthday has occurred yet this year.
 */
export function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
