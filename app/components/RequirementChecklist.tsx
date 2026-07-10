import { CheckCircle2, Circle } from "lucide-react";

export type RequirementItem = {
  label: string;
  met: boolean;
  /** Optional extra context, e.g. "3 of 5 activities completed". */
  detail?: string;
};

// Shows what is (not) done towards a goal — used for certificate eligibility
// (PDF spec section 21: "Display incomplete Course requirements"). Feed it
// from the backend eligibility endpoint once that ships; until then it can
// render locally-derived requirements.
export default function RequirementChecklist({
  items,
  className = "",
}: {
  items: RequirementItem[];
  className?: string;
}) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          {item.met ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-[#1a6b3c]"
            />
          ) : (
            <Circle size={20} className="mt-0.5 shrink-0 text-gray-300" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                item.met ? "text-gray-800" : "text-gray-500"
              }`}
            >
              {item.label}
            </p>
            {item.detail && (
              <p className="text-xs text-gray-500">{item.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
