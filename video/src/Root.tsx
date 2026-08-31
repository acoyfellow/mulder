import {Composition} from "remotion";
import {MulderFilm} from "./Film";

export function Root() {
  return <Composition id="MulderLaunch" component={MulderFilm} durationInFrames={1200} fps={30} width={1920} height={1080} defaultProps={{music: undefined}} />;
}
