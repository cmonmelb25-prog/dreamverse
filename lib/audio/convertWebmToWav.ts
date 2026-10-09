import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/**
 * Production Audio Converter
 *
 * Converts WebM/Opus voice recordings into:
 *   - WAV
 *   - PCM 16-bit
 *   - 16 kHz
 *   - Mono
 *
 * Optimized for speech-to-text engines.
 */

const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VOICE_DURATION = 60; // seconds
const CONVERSION_TIMEOUT_MS = 30_000;

if (!ffmpegPath) {
  throw new Error('Unable to locate FFmpeg binary.');
}

ffmpeg.setFfmpegPath(ffmpegPath);

export async function convertWebmToWav(
  webmBuffer: Buffer
): Promise<Buffer> {
  if (!Buffer.isBuffer(webmBuffer) || webmBuffer.length === 0) {
    throw new Error('Empty audio buffer.');
  }

  if (webmBuffer.length > MAX_AUDIO_SIZE) {
    throw new Error('Audio exceeds maximum size.');
  }

  const id = uuidv4();

  const inputPath = path.join(os.tmpdir(), `${id}.webm`);
  const outputPath = path.join(os.tmpdir(), `${id}.wav`);

  try {
    await fs.writeFile(inputPath, webmBuffer);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputPath);

      let finished = false;

      const complete = (callback: () => void) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        callback();
      };

      const timeout = setTimeout(() => {
        try {
          command.kill('SIGKILL');
        } catch {
          // ignore
        }

        complete(() => {
          reject(new Error('FFmpeg conversion timed out.'));
        });
      }, CONVERSION_TIMEOUT_MS);

      command
        .inputOption('-t', String(MAX_VOICE_DURATION))
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .on('start', (cmd: string) => {
          console.debug('[FFmpeg]', cmd);
        })
        .on('end', () => {
          complete(resolve);
        })
        .on('error', (err: Error) => {
          complete(() => reject(err));
        })
        .save(outputPath);
    });

    return await fs.readFile(outputPath);
  } finally {
    await Promise.allSettled([
      fs.unlink(inputPath),
      fs.unlink(outputPath),
    ]);
  }
}