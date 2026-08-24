import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";

type CloudinarySignature = {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  upload_preset: string;
  /**
   * The endpoint the backend had in mind. Deliberately not used.
   *
   * It is returned per upload *type* rather than per file — every activity
   * gets "video" — so following it sends PDFs to the video endpoint. The
   * endpoint is not part of the signed parameters, so resourceTypeFor decides
   * it from the file instead. Kept here so the field is documented rather than
   * looking overlooked.
   */
  resource_type?: "video" | "image" | "raw" | "auto";
};

/**
 * What is being uploaded, from the app's point of view. Finer-grained than what
 * the backend signs, because book PDFs also decide the Cloudinary resource
 * type ("raw" rather than "auto").
 */
export type CloudinaryUploadType =
  | "activity"
  | "course"
  | "book_pdf"
  | "book_cover";

/**
 * The backend signs uploads against a whitelist and rejects anything else with
 * "Unknown upload type '<x>'", so these must match its list exactly. It
 * accepts: activity, book_cover, book_pdf, course (admin) and profile_picture
 * (any authenticated user). Each maps to its own Cloudinary folder, so keep
 * them distinct rather than collapsing them onto one type.
 */
const SIGNATURE_TYPE: Record<CloudinaryUploadType, string> = {
  activity: "activity",
  course: "course",
  book_pdf: "book_pdf",
  book_cover: "book_cover",
};

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  original_filename?: string;
  done?: boolean;
};

const CHUNK_SIZE = 6 * 1024 * 1024;
const CHUNK_THRESHOLD = 100 * 1024 * 1024;

async function getUploadSignature(type: CloudinaryUploadType = "activity") {
  const response = await fetch(
    `/api/training/cloudinary-signature?type=${SIGNATURE_TYPE[type]}`,
    { cache: "no-store" },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, "Could not authorize the file upload."),
    );
  }

  const signature = readApiItem<CloudinarySignature>(payload);

  if (
    !signature?.signature ||
    !signature.timestamp ||
    !signature.api_key ||
    !signature.cloud_name
  ) {
    throw new Error("The Cloudinary signature response is incomplete.");
  }

  return signature;
}

function createUploadForm(
  file: Blob,
  signature: CloudinarySignature,
) {
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signature.api_key);
  form.set("timestamp", String(signature.timestamp));
  form.set("signature", signature.signature);

  if (signature.folder) {
    form.set("folder", signature.folder);
  }

  if (signature.upload_preset) {
    form.set("upload_preset", signature.upload_preset);
  }

  return form;
}

/**
 * Which Cloudinary endpoint to upload to, decided from the file itself.
 *
 * The endpoint lives in the URL rather than the signed parameters, so it is
 * ours to choose — the same signature uploads to any of them.
 *
 * It has to be chosen per file, not per upload type. The signature response
 * carries a resource_type, but the backend returns "video" for every activity
 * regardless of what is being sent, so following it uploaded PDFs to the video
 * endpoint and they were refused as "Unsupported video format or file".
 *
 * Audio maps to "video" because Cloudinary has no separate audio type.
 * Everything else goes to "auto" and is detected on arrival, which handles
 * PDFs, slides and images alike. Book PDFs stay "raw" so they download as
 * files rather than being treated as images.
 */
function resourceTypeFor(file: Blob, type: CloudinaryUploadType) {
  if (type === "book_pdf") return "raw";

  const mime = file.type.toLowerCase();
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";

  return "auto";
}

async function readCloudinaryResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
  throw new Error(
    extractErrorMessage(payload, "Cloudinary could not upload this file."),
  );
}

  return payload as CloudinaryUploadResult;
}

export async function uploadFileToCloudinary(
  file: File,
  onProgress?: (percentage: number) => void,
  type: CloudinaryUploadType = "activity",
) {
  const signature = await getUploadSignature(type);
  const resourceType = resourceTypeFor(file, type);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    signature.cloud_name,
  )}/${resourceType}/upload`;

  if (file.size <= CHUNK_THRESHOLD) {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: createUploadForm(file, signature),
    });

    const result = await readCloudinaryResponse(response);
    onProgress?.(100);
    return result;
  }

  const uploadId = crypto.randomUUID();
  let finalResult: CloudinaryUploadResult | null = null;

  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, file.size) - 1;
    const chunk = file.slice(start, end + 1);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Unique-Upload-Id": uploadId,
        "Content-Range": `bytes ${start}-${end}/${file.size}`,
      },
      body: createUploadForm(chunk, signature),
    });

    const result = await readCloudinaryResponse(response);

    if (result.done !== false) {
      finalResult = result;
    }

    onProgress?.(Math.round(((end + 1) / file.size) * 100));
  }

  if (!finalResult?.secure_url || !finalResult.public_id) {
    throw new Error("Cloudinary did not return the completed upload details.");
  }

  return finalResult;
}
