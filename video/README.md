# Mulder video studio

This folder turns approved words, browser recordings, images, and music into the Mulder marketing video.

## Edit the story

Change `src/story.ts`. It contains the words and the start and end frame for each scene. The video uses 30 frames per second.

## Preview the video

```sh
npm install
npm run studio
```

Remotion Studio opens a timeline in the browser. Select `MulderLaunch` to play the video and inspect any frame.

## Add footage

Put recordings in `public/recordings/`. Use a descriptive file name. Update the matching `OffthreadVideo` path in `src/Film.tsx`.

## Add music

Put a licensed track in `public/music/`. Record its source, author, license, and download date in `public/music/LICENSES.md`. Set the `music` default prop in `src/Root.tsx` to its path. Keep speech and on-screen words clear.

## Render the final files

```sh
npm run check
npm run render
npm run still
```

The commands create an MP4 and a poster in `renders/`. Watch the full MP4 before it replaces the website video.

## Review by hand

Check every cut at normal speed. Read every slide aloud. Confirm that the real browser footage matches the words around it. Confirm that the final file has no clipped words, empty frames, private data, or unlicensed audio.
