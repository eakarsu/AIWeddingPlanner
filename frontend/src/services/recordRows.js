// List endpoints return arrays today; accept the common paginated envelope as well.
export function recordRows(payload, label = 'Records', key) {
  const rows = Array.isArray(payload) ? payload :
    key ? (payload?.[key] ?? payload?.data) : payload?.data;
  if (!Array.isArray(rows)) {
    throw new Error(`${label} response did not contain a record list.`);
  }
  return rows;
}
