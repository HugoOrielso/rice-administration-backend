// src/utils/uploadToCloudinary.ts
import cloudinary from "../../config/cloudinary";


export function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  folder = "products"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url) {
          return reject(new Error("Cloudinary no devolvió secure_url"));
        }

        resolve(result.secure_url);
      }
    );

    stream.end(fileBuffer);
  });
}