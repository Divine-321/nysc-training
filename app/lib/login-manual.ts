// The portal user manual shown on the login page is stored as a learning
// "book" whose title starts with this marker. Admin Settings attaches it;
// the public /api/public/login-manual route finds it by this prefix.
export const LOGIN_MANUAL_MARKER = "[LOGIN MANUAL]";

export type LoginManual = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
};
