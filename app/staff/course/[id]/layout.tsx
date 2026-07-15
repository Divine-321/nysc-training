import React from "react";

/**
 * Pass-through layout. Course chrome intentionally lives with each view:
 *  - The Modules page, live-session list and evaluation render inside the
 *    main staff dashboard layout (which keeps the primary navigation).
 *  - The course player (`/learn`) and the proctored assessment are immersive
 *    full-screen views that supply their own header and (for the player) an
 *    only-the-current-module learning sidebar.
 * There is deliberately no course-wide "menu" sidebar here.
 */
export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
