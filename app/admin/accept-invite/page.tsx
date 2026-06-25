import AcceptInviteForm from "./AcceptInviteForm";

type AcceptInvitePageProps = {
  searchParams: Promise<{
    token?: string | string[];
    email?: string | string[];
  }>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const query = await searchParams;

  return (
    <AcceptInviteForm
      token={readSingleValue(query.token)}
      email={readSingleValue(query.email)}
    />
  );
}
