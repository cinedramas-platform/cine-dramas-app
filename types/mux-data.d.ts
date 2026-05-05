declare module '@mux/mux-data-react-native-video' {
  import type { ComponentType } from 'react';

  type MuxOptions = {
    application_name?: string;
    data?: {
      env_key?: string;
      player_name?: string;
      video_id?: string;
      video_title?: string;
      [key: string]: string | number | boolean | undefined;
    };
  };

  function muxReactNativeVideo<P extends object>(
    VideoComponent: ComponentType<P>,
  ): ComponentType<P & { muxOptions?: MuxOptions }>;

  export default muxReactNativeVideo;
}
