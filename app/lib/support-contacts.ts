/**
 * Support numbers shown to staff and admins.
 *
 * The only file to edit when a number changes — nothing else hardcodes one, so
 * NYSC can hand this to whoever maintains the portal without them touching a
 * layout. Leave the array empty and every support panel disappears on its own,
 * which is deliberate: no number at all is better than one nobody answers.
 *
 * `phone` must be in full international form with no spaces, "+" or leading
 * zero — WhatsApp rejects anything else. A Lagos line written 0803 123 4567
 * becomes 2348031234567.
 */
export type SupportContact = {
  id: string;
  /** Who picks up, e.g. "Help Desk" or "Training Unit". */
  label: string;
  /** International format, digits only: 234XXXXXXXXXX */
  phone: string;
};

export const SUPPORT_CONTACTS: SupportContact[] = [
  // Stored as full international digits with no +, spaces or leading zero,
  // because that is the only form wa.me accepts. formatPhone puts the
  // readable version back on screen.
  //
  // The labels say which line, not who answers — rename them to the desk or
  // person once that is settled, since "Training Unit" helps a stuck learner
  // choose and "Help line 2" does not.
  { id: "line-1", label: "Help line 1", phone: "2348065706356" },
  { id: "line-2", label: "Help line 2", phone: "2349018415032" },
  { id: "line-3", label: "Help line 3", phone: "2348168188533" },
];

/** 2348031234567 -> "+234 803 123 4567", for display only. */
export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("234")) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return `+${digits}`;
}

export const callLink = (phone: string) => `tel:+${phone.replace(/\D/g, "")}`;

/**
 * wa.me opens the WhatsApp app when installed and the web client otherwise, so
 * one link covers phones and desktops without us detecting anything.
 */
export const whatsappLink = (phone: string, message?: string) => {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

/** Prefills the chat so whoever answers knows where the person came from. */
export const SUPPORT_MESSAGE =
  "Hello, I need help with the NYSC Staff E-Training Portal.";
