import { addIcons } from 'ionicons';
import {
  alertCircle,
  bug,
  checkmark,
  close,
  create,
  disc,
  ellipsisVertical,
  folder,
  home,
  informationCircle,
  list,
  musicalNote,
  pause,
  pencil,
  person,
  pin,
  play,
  playSkipBack,
  playSkipForward,
  refresh,
  removeCircle,
  repeat,
  search,
  settings,
  shuffle,
  star,
  stop,
  volumeHigh,
  volumeLow,
  volumeMute,
} from 'ionicons/icons';

/** Register all icons used by the application. */
export function registerIcons(): void {
  addIcons({
    alertCircle,
    bug,
    checkmark,
    close,
    create,
    disc,
    ellipsisVertical,
    folder,
    home,
    informationCircle,
    list,
    musicalNote,
    pause,
    pencil,
    person,
    pin,
    play,
    playSkipBack,
    playSkipForward,
    refresh,
    removeCircle,
    repeat,
    search,
    settings,
    shuffle,
    star,
    stop,
    volumeHigh,
    volumeLow,
    volumeMute,
  });
}

/** Icon names for library item types. */
export const REF_ICONS: Record<string, string> = {
  album: 'disc',
  artist: 'person',
  directory: 'folder',
  playlist: 'list',
  track: 'musical-note',
};

/** Icon names for log levels. */
export const LOG_ICONS: Record<string, string> = {
  debug: 'bug',
  error: 'alert-circle',
  info: 'information-circle',
  log: 'information-circle',
  warn: 'alert-circle',
};
