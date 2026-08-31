import type {CSSProperties, ReactNode} from "react";
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {story, timing} from "./story";

const colors = {paper: "#f8f8f5", ink: "#111210", muted: "#667080", line: "#d9dbd6", accent: "#c9511f", white: "#ffffff"};
const font = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

function Scene({start, end, children}: {start: number; end: number; children: ReactNode}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + 12, end - 12, end], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <Sequence from={start} durationInFrames={end - start}><AbsoluteFill style={{opacity}}>{children}</AbsoluteFill></Sequence>;
}

function Mark() {
  return <div style={{position: "absolute", top: 72, left: 82, display: "flex", alignItems: "center", font: `600 30px ${font}`}}><span style={{width: 14, height: 14, borderRadius: "50%", background: colors.accent}} />Mulder</div>;
}

function Slide({children, align = "left"}: {children: ReactNode; align?: "left" | "center"}) {
  return <AbsoluteFill style={{background: colors.paper, color: colors.ink, fontFamily: font, padding: "160px 150px 110px", justifyContent: "center", alignItems: align === "center" ? "center" : "flex-start", textAlign: align}}><Mark />{children}</AbsoluteFill>;
}

function RisingText({children, delay = 0, style}: {children: ReactNode; delay?: number; style?: CSSProperties}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame: frame - delay, fps, config: {damping: 24, stiffness: 130, mass: 1}});
  return <div style={{opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [42, 0])}px)`, ...style}}>{children}</div>;
}

function ApiCard() {
  return <div style={{width: 700, border: `2px solid ${colors.ink}`, borderRadius: 18, background: colors.white, padding: 42, font: `25px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace`}}>
    <div style={{color: colors.muted}}>GET /api/services/{"{service}"}</div>
    <div><span style={{color: colors.accent}}>operationId:</span> get_service_health</div>
    <div><span style={{color: colors.accent}}>x-webmcp-enabled:</span> true</div>
  </div>;
}

function BrowserCard() {
  return <div style={{width: 700, border: `1px solid ${colors.line}`, borderRadius: 18, overflow: "hidden", background: colors.white}}>
    <div style={{height: 64, borderBottom: `1px solid ${colors.line}`, display: "flex", alignItems: "center", gap: 9, padding: "0 24px"}}>{[0, 1, 2].map((value) => <span key={value} style={{width: 11, height: 11, borderRadius: "50%", background: "#b9bbb5"}} />)}</div>
    <div style={{height: 260, display: "grid", placeItems: "center", color: colors.muted, font: `500 28px ${font}`}}>Website</div>
  </div>;
}

export function MulderFilm({music}: {music?: string}) {
  const frame = useCurrentFrame();
  const toolProgress = interpolate(frame, [272, 325], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{background: colors.paper}}>
    {music ? <Audio src={staticFile(music)} volume={0.18} /> : null}
    <Scene start={timing.title[0]} end={timing.title[1]}><Slide><RisingText style={{font: `600 104px/.98 ${font}`, maxWidth: 1400}}>{story.title}</RisingText></Slide></Scene>
    <Scene start={timing.browserGap[0]} end={timing.browserGap[1]}><Slide><div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 100, width: "100%", alignItems: "center"}}><RisingText><ApiCard /></RisingText><RisingText delay={10}><BrowserCard /></RisingText></div><RisingText delay={18} style={{font: `500 42px/1.25 ${font}`, marginTop: 60, maxWidth: 1300}}>{story.browserGap.map((line) => <div key={line}>{line}</div>)}</RisingText></Slide></Scene>
    <Scene start={timing.promise[0]} end={timing.promise[1]}><Slide align="center"><div style={{display: "flex", alignItems: "center", gap: 60}}><div style={{opacity: 1 - toolProgress}}><ApiCard /></div><div style={{width: 90, height: 8, borderRadius: 8, background: colors.accent, transform: `scaleX(${toolProgress})`, transformOrigin: "left"}} /><div style={{border: `2px solid ${colors.ink}`, background: colors.white, borderRadius: 18, padding: "38px 52px", font: `600 34px ui-monospace, monospace`, opacity: toolProgress}}>get_service_health</div></div><RisingText delay={18} style={{font: `600 62px/1.08 ${font}`, maxWidth: 1300, marginTop: 80}}>{story.promise}</RisingText></Slide></Scene>
    <Scene start={timing.choice[0]} end={timing.choice[1]}><Slide><RisingText><div style={{font: `25px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace`, background: "#171817", color: "#f4f4ef", borderRadius: 18, padding: "52px 60px", minWidth: 1050}}><div><span style={{color: "#ffb979"}}>operationId:</span> get_service_health</div><div><span style={{color: "#ffb979"}}>x-webmcp-enabled:</span> <span style={{color: "#a9d5ff"}}>true</span></div></div></RisingText><RisingText delay={20} style={{font: `600 68px/1.08 ${font}`, marginTop: 64}}>{story.choice}</RisingText></Slide></Scene>
    <Scene start={timing.question[0]} end={timing.question[1]}><Slide><RisingText style={{color: colors.muted, font: `500 24px ${font}`, marginBottom: 24}}>Ask the browser agent</RisingText><RisingText delay={8} style={{font: `600 76px/1.08 ${font}`, maxWidth: 1350}}>“{story.question}”</RisingText><RisingText delay={30} style={{marginTop: 70, borderLeft: `6px solid ${colors.accent}`, paddingLeft: 28, font: `600 29px ui-monospace, monospace`}}>{story.tool}</RisingText></Slide></Scene>
    <Scene start={timing.recording[0]} end={timing.recording[1]}><AbsoluteFill style={{background: colors.paper, padding: "64px 78px", justifyContent: "center"}}><div style={{border: `1px solid ${colors.line}`, background: colors.white, padding: 16}}><OffthreadVideo src={staticFile("recordings/mulder-demo.mp4")} startFrom={180} muted style={{width: "100%", height: 870, objectFit: "contain"}} /></div><div style={{position: "absolute", right: 110, bottom: 88, padding: "16px 24px", borderRadius: 10, background: colors.ink, color: colors.white, font: `600 22px ${font}`}}>Real browser call</div></AbsoluteFill></Scene>
    <Scene start={timing.unchanged[0]} end={timing.unchanged[1]}><Slide>{story.unchanged.map((line, index) => <RisingText key={line} delay={index * 14} style={{font: `${index ? 500 : 600} ${index ? 64 : 86}px/1.12 ${font}`, color: index ? colors.muted : colors.ink, marginTop: index ? 28 : 0}}>{line}</RisingText>)}</Slide></Scene>
    <Scene start={timing.boundaries[0]} end={timing.boundaries[1]}><Slide>{story.boundaries.map((line, index) => <RisingText key={line} delay={index * 16} style={{font: `600 78px/1.12 ${font}`, marginTop: index ? 34 : 0}}><span style={{color: colors.accent}}>✓</span> {line}</RisingText>)}</Slide></Scene>
    <Scene start={timing.callToAction[0]} end={timing.callToAction[1]}><Slide align="center"><RisingText style={{font: `600 76px/1.08 ${font}`, maxWidth: 1350}}>{story.callToAction}</RisingText><RisingText delay={18} style={{font: `600 34px ${font}`, color: colors.accent, marginTop: 54}}>{story.address}</RisingText></Slide></Scene>
  </AbsoluteFill>;
}
