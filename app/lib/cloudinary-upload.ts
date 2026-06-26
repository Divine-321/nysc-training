import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";

type CloudinarySignature = {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  upload_preset: string;
};

export type CloudinaryUploadType =
  | "module"
  | "course"
  | "book_pdf"
  | "book_cover";

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  original_filename?: string;
  done?: boolean;
};

const CHUNK_SIZE = 6 * 1024 * 1024;
const CHUNK_THRESHOLD = 100 * 1024 * 1024;

async function getUploadSignature(type: CloudinaryUploadType = "module") {
  const response = await fetch(`/api/training/cloudinary-signature?type=${type}`, {
    cache: "no-store",
  });
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
  type: CloudinaryUploadType = "module",
) {
  const signature = await getUploadSignature(type);
  const resourceType = type === "book_pdf" ? "raw" : "auto";
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
