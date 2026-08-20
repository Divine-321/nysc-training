import { MessageCircle, Phone } from "lucide-react";
import {
  SUPPORT_CONTACTS,
  SUPPORT_MESSAGE,
  callLink,
  formatPhone,
  whatsappLink,
} from "@/app/lib/support-contacts";

type SupportContactsProps = {
  /** "sidebar" sits on the green nav; "panel" sits on a white page. */
  variant?: "sidebar" | "panel";
  className?: string;
};

/**
 * The support numbers, each offering a call and a WhatsApp chat.
 *
 * Both are plain links rather than buttons, so a long-press offers "copy
 * number" and the browser can hand `tel:` to whatever the device uses. On a
 * desktop with no phone app the call link may do nothing, which is why the
 * number is always shown as text and can simply be read off the screen.
 *
 * Renders nothing when no contacts are configured — see support-contacts.ts.
 */
export default function SupportContacts({
  variant = "panel",
  className = "",
}: SupportContactsProps) {
  if (SUPPORT_CONTACTS.length === 0) return null;

  const isSidebar = variant === "sidebar";

  return (
    <div
      className={`rounded-2xl p-4 ${
        isSidebar ? "bg-black/20 text-white" : "border border-gray-200 bg-gray-50"
      } ${className}`}
    >
      <p
        className={`text-sm font-semibold ${
          isSidebar ? "text-white" : "text-gray-800"
        }`}
      >
        Need help?
      </p>
      <p
        className={`mt-0.5 text-xs ${
          isSidebar ? "text-green-200" : "text-gray-500"
        }`}
      >
        Call or message us on WhatsApp.
      </p>

      <ul className="mt-3 space-y-2.5">
        {SUPPORT_CONTACTS.map((contact) => (
          <li key={contact.id}>
            <p
              className={`text-[11px] font-medium uppercase tracking-wide ${
                isSidebar ? "text-green-200/80" : "text-gray-400"
              }`}
            >
              {contact.label}
            </p>

            <div className="mt-1 flex items-center gap-2">
              <a
                href={callLink(contact.phone)}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
                  isSidebar
                    ? "border border-white/70 text-white hover:bg-white/10"
                    : "border border-[#1a6b3c] text-[#1a6b3c] hover:bg-green-50"
                }`}
              >
                <Phone size={13} />
                {formatPhone(contact.phone)}
              </a>

              <a
                href={whatsappLink(contact.phone, SUPPORT_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Message ${contact.label} on WhatsApp`}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1da851]"
              >
                <MessageCircle size={13} />
                Chat
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
