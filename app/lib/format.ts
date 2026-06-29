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

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
