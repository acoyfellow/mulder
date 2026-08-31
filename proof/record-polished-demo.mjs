import { access, writeFile } from "node:fs/promises";
import { openLocalBrowser } from "unsurf/skills/record";

const url = process.env.DEMO_URL;
const output = process.env.VIDEO_OUTPUT;
const ready = process.env.RECORDING_READY;
const nativeDone = process.env.NATIVE_DONE;
if (!url || !output || !ready || !nativeDone) throw new Error("missing recording configuration");

const browser = await openLocalBrowser();
let recording = false;
try {
  await browser.startRecording(output);
  recording = true;
  await browser.goto(url);
  await browser.wait({ selector: "#mulder-result", timeoutMs: 10_000 });
  await browser.wait(2_500);
  await writeFile(ready, "ready\n");
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      await access(nativeDone);
      break;
    } catch {
      await browser.wait(100);
    }
  }
  await access(nativeDone);
  await browser.wait(700);
  await browser.goto(url);
  await browser.wait({ selector: ".flow .step:nth-child(3).done", timeoutMs: 10_000 });
  await browser.wait(4_500);
} finally {
  if (recording) await browser.stopRecording();
  await browser.close();
}
