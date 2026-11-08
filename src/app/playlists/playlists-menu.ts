import { MenuService } from '../services/menu.service';
import { PlaylistsService } from '../services/playlists.service';

/** Show the playlist sort order menu. */
export function showPlaylistsMenu(menu: MenuService, playlists: PlaylistsService, event: Event): Promise<void> {
  const order = playlists.order();
  return menu.show(event, [
    { text: 'Sort by name', checked: !!order.name, toggle: (name) => playlists.setOrder({ name }) },
    { text: 'Sort by scheme', checked: !!order.scheme, toggle: (scheme) => playlists.setOrder({ scheme }) },
  ]);
}
