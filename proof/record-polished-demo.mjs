import { writeFile } from "node:fs/promises";
import { openLocalBrowser } from "unsurf/skills/record";

const url = process.env.DEMO_URL;
const output = process.env.VIDEO_OUTPUT;
const ready = process.env.RECORDING_READY;
if (!url || !output || !ready) throw new Error("missing recording configuration");

const browser = await openLocalBrowser();
let recording = false;
try {
  await browser.startRecording(output);
  recording = true;
  await browser.goto(url);
  await browser.wait({ selector: "#mulder-result", timeoutMs: 10_000 });
  await browser.wait(2_500);
  await writeFile(ready, "ready\n");
  await browser.wait(2_500);
  await browser.goto(url);
  await browser.wait({ selector: "#mulder-result", timeoutMs: 10_000 });
  await browser.wait(4_500);
} finally {
  if (recording) await browser.stopRecording();
  await browser.close();
}
