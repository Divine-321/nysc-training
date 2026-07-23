import Image from "next/image";

export type CertificateDocumentProps = {
  recipientName: string;
  fileNumber: string;
  courseName: string;
  cohortName: string;
  certificateId: string;
  /** Already-formatted issue date, e.g. "23 July 2026". */
  issuedDate: string;
  /** Training start/end, already formatted. Both must be set for the
   *  "held from … to …" line to show; otherwise it is omitted. */
  periodFrom?: string;
  periodTo?: string;
};

// Single source of truth for the certificate design. Rendered identically on
// the admin "Certificate Design" preview and the staff certificate page so the
// two can never drift apart again. It draws the fixed 800×565 layout; the
// caller supplies the sized canvas box (position:relative, 800×565, and the
// id="certificate-canvas" the print styles target).
//
// Spacing is kept compact on purpose: the canvas height is fixed, so the whole
// body plus footer must fit inside the green frame with padding to spare —
// otherwise the "Date of issue"/"Authorized signature" labels spill past the
// border.
export default function CertificateDocument({
  recipientName,
  fileNumber,
  courseName,
  cohortName,
  certificateId,
  issuedDate,
  periodFrom,
  periodTo,
}: CertificateDocumentProps) {
  return (
    <>
      <div className="absolute inset-5 border-[3px] border-[#1a6b3c] p-2">
        <div className="absolute inset-0 m-1 border border-[#1a6b3c]/30" />
      </div>
      <div className="absolute left-5 top-5 h-12 w-12 border-l-4 border-t-4 border-[#1a6b3c]" />
      <div className="absolute right-5 top-5 h-12 w-12 border-r-4 border-t-4 border-[#1a6b3c]" />
      <div className="absolute bottom-5 left-5 h-12 w-12 border-b-4 border-l-4 border-[#1a6b3c]" />
      <div className="absolute bottom-5 right-5 h-12 w-12 border-b-4 border-r-4 border-[#1a6b3c]" />

      <div className="absolute right-12 top-10 z-20 text-right">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Certificate ID
        </p>
        <p className="font-serif text-sm font-semibold text-gray-700">
          {certificateId || "N/A"}
        </p>
      </div>

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-16 py-8 text-center">
        <Image
          src="/images/nysc-logo.png"
          alt="NYSC Logo"
          width={48}
          height={48}
          className="mb-2 h-12 w-12 object-contain opacity-90"
        />

        <h1 className="mb-1 max-w-full break-words font-serif text-2xl font-bold uppercase leading-tight tracking-wide text-[#1a6b3c]">
          National Youth Service Corps
        </h1>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
          Certificate of Training
        </p>

        <p className="mb-1 text-lg italic leading-snug text-gray-700">
          This is to certify that
        </p>
        <h2 className="mb-1 max-w-full break-words border-b-2 border-gray-300 px-6 pb-1 font-serif text-4xl font-bold leading-tight text-gray-900">
          {recipientName || "Staff Name"}
        </h2>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-600">
          {fileNumber || "N/A"}
        </p>

        <p className="mb-1 text-lg italic leading-snug text-gray-700">
          has successfully completed the training course
        </p>
        <h3 className="mb-1 max-w-full break-words px-6 text-2xl font-bold leading-tight text-[#1a6b3c]">
          {courseName || "Course Title"}
        </h3>
        <p className="text-sm font-semibold text-gray-500">
          {cohortName ? `${cohortName} Cohort` : ""}
        </p>
        {periodFrom && periodTo ? (
          <p className="mt-1 text-sm italic leading-snug text-gray-600">
            held from{" "}
            <span className="font-semibold not-italic text-gray-700">
              {periodFrom}
            </span>{" "}
            to{" "}
            <span className="font-semibold not-italic text-gray-700">
              {periodTo}
            </span>
          </p>
        ) : null}

        <div className="mt-auto grid w-full max-w-full grid-cols-3 items-end gap-4 pt-4">
          <div className="flex flex-col items-center">
            <span className="pb-1 font-serif text-lg font-semibold italic leading-none text-gray-900">
              {issuedDate}
            </span>
            <div className="w-full border-t border-gray-400 pt-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Date of Issue
              </p>
            </div>
          </div>

          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-yellow-200 shadow-lg"
            style={{
              background: "linear-gradient(to bottom right, #fde047, #ca8a04)",
            }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-700">
              <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-widest text-yellow-900">
                Official
                <br />
                NYSC
                <br />
                Seal
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className="pb-1 text-lg leading-none">&nbsp;</span>
            <div className="w-full border-t border-gray-400 pt-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Authorized Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
