"use server";

import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function uploadVideo(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    return { error: "No file uploaded." };
  }

  // Limit file size (e.g., 300MB) check
  if (file.size > 300 * 1024 * 1024) {
    return { error: "File size exceeds 300MB limit." };
  }

  // Generate a safe filename (simple approach: keep original name + timestamp)
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  
  // Path to public/uploads
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, filename);

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    return { url: `/uploads/${filename}` };
  } catch (error) {
    console.error("Error saving file:", error);
    return { error: "Failed to save file." };
  }
}