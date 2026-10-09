import express from "express";
import { Storage } from "@google-cloud/storage";
import { exec } from "child_process";
import util from "util";
import fs from "fs";

const app = express();
app.use(express.json());

const storage = new Storage();
const execPromise = util.promisify(exec);

app.post("/transcode", async (req, res) => {
  const { bucket, inputPath, outputPath } = req.body || {};

  if (!bucket || !inputPath || !outputPath) {
    return res.status(400).json({
      success: false,
      error: "bucket, inputPath, and outputPath are required"
    });
  }

  const inputFile = "/tmp/input";
  const outputFile = "/tmp/output.mp4";

  try {
    await storage.bucket(bucket).file(inputPath).download({
      destination: inputFile
    });

    const cmd = `
      ffmpeg -y -i "${inputFile}" \
      -vcodec libx264 -preset fast -crf 23 \
      -acodec aac -b:a 128k \
      -movflags +faststart \
      "${outputFile}"
    `;

    await execPromise(cmd);

    await storage.bucket(bucket).upload(outputFile, {
      destination: outputPath,
      metadata: {
        contentType: "video/mp4",
        cacheControl: "public, max-age=31536000"
      }
    });

    try { fs.unlinkSync(inputFile); } catch {}
    try { fs.unlinkSync(outputFile); } catch {}

    const publicUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(outputPath)}?alt=media`;

    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Transcode error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Transcode failed"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Transcoder running on port " + PORT);
});
