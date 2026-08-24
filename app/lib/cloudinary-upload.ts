import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";

type CloudinarySignature = {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  upload_preset: string;
  /**
   * Which Cloudinary endpoint the signature was generated for — "video",
   * "image" or "raw".
   *
   * It has to be obeyed. A signature covers the parameters it was made from,
   * so uploading to a different endpoint than the one it was signed for is
   * rejected. Optional only because older backends did not send it.
   *
   * Note that audio belongs to "video" in Cloudinary's model; there is no
   * separate audio type. Ignoring this field sent mp3s to the image endpoint,
   * which answered "Image file format mp3 not allowed".
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
  // The backend's answer wins. "auto" remains the fallback for a signature
  // that does not name one, and book PDFs stay "raw" so they are served as
  // files rather than transformed as images.
  const resourceType =
    signature.resource_type ?? (type === "book_pdf" ? "raw" : "auto");
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
