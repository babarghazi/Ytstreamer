import { upload } from "@vercel/blob/client";

export async function saveVideo(file, folder, key, progress) {
  const name = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  return upload(folder + "/" + crypto.randomUUID() + "-" + name, file, {
    access: "private",
    handleUploadUrl: "/api/upload",
    headers: { "X-Studio-Storage-Key": key },
    multipart: true,
    onUploadProgress: ({ percentage }) => progress(percentage),
  });
}
