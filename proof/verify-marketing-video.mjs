import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

const source = process.argv[2] ?? "demo/mulder-demo.mp4";
const published = process.argv[3];
const output = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_name,width,height,r_frame_rate", "-of", "json", source], {encoding: "utf8"}));
const video = output.streams.find((stream) => stream.codec_name === "h264");
const duration = Number(output.format.duration);
if (!video || video.width !== 1920 || video.height !== 1080 || video.r_frame_rate !== "30/1") throw new Error("marketing video must be 1920x1080 H.264 at 30 FPS");
if (duration < 39.9 || duration > 40.2) throw new Error(`marketing video has wrong duration: ${duration}`);
if ((await stat(source)).size < 1_000_000) throw new Error("marketing video is too small");
if (published) {
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  if (digest(await readFile(source)) !== digest(await readFile(published))) throw new Error("published marketing video differs from the approved render");
}
console.log(`MULDER_MARKETING_VIDEO_OK:${duration.toFixed(2)}s:1920x1080:30fps`);
