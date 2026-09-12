export function formatDate(value: string, style: "medium" | "long" = "medium") {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: style }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * True when two timestamps fall on the same calendar day where the reader is.
 *
 * Used to decide whether a session's end needs its own date. Showing only the
 * start date and two clock times hid a live session that ran from 25 August to
 * 25 September behind "25 Aug, 13:32 – 13:33", which reads as one minute last
 * month. An unparseable value counts as "not the same day", so the fuller
 * label is shown rather than a confident wrong one.
 */
export function isSameLocalDay(first: string, second: string) {
  const start = new Date(first);
  const end = new Date(second);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  );
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
