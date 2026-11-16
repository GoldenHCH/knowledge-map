import { ILessonVideo } from './knowledge-map.interfaces';

export const landingDemoVideo: { src: string; poster: string } = {
  src: '/media/chain-rule.mp4',
  poster: '/media/chain-rule.jpg',
};

export const lessonVideos: Record<string, ILessonVideo> = {
  'chain-rule': {
    src: '/media/chain-rule.mp4',
    poster: '/media/chain-rule.jpg',
    caption: 'Three gears, three rates: when one drives the next, the rates multiply.',
  },
};
