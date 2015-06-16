1.1.0 2015-06-16
-----------------

- Add advanced search.

- Add play button to library and playlist nav-bar.

- Add server management in Android app.

1.0.0 2015-06-05
-----------------

- Merge tracklist menus.

- Add three-state repeat button.

- Add `ZeroConf` cordova plugin.

- New logo/icon.


0.10.7 2015-06-01
-----------------

- Various logging improvements,

- Fix CSS color for anchor items.

- Add platform information to `About` screen.

- Delay hiding of splash screen in Android app.


0.10.6 2015-05-29
-----------------

- Add workaround for library browsing cache/resolve issues.


0.10.5 2015-05-28
-----------------

- Add workaround for loading overlay issues.

- Start using Mopidy v1.1 `tlid` methods.

- Add `ngCordova`.


0.10.4 2015-05-24
-----------------

- Add refresh to playback view.

- Reload application after language change.

- Redirect to application root URL on browser reload.


0.10.3 2015-05-23
-----------------

- Improve loading overlay issues.

- Improve handling of fallback thumbnail images.

- Change search results title to only show query.

- Add "Back" button translations.

- Various UI improvements.


0.10.2 2015-05-23
-----------------

- Fix broken cover art providers.

- Improve stylesheet handling.


0.10.1 2015-05-22
-----------------

- Use `angular.js` template cache.


0.10.0 2015-05-22
-----------------

- Add reset functionality.

- Detect browser language.

- Upgrade `ionic` to version `1.0.0`.

- Integrate `angular-local-storage`.

- Various bug fixes and UI improvements.


0.9.4 2015-05-11
----------------

- Improve browser reload behavior.

- Disable caching for certain views.

- Reduce log/debug messages.


0.9.3 2015-05-07
----------------

- Add `cordova-plugin-splashscreen` to Android app.

- Enable caching for playback view.

- Remove support for album images.

- Catch errors from cover art services.

- Display playlist schemes/backends.

- Upgrade `ionic` to `1.0.0-rc.5`.

- Upgrade `cordova` to version `5.0.0`.


0.9.2 2015-04-25
----------------

- Fix broken cover art images in Android app.

- Fix default title when adding to homescreen.

- Add missing translations.

- Upgrade `ionic` framework to 1.0.0-rc.4.


0.9.1 2015-04-25
----------------

- Fix Android APK.


0.9.0 2015-04-24
----------------

- Add edit mode for playlists.

- Create new (empty) playlists.

- Sort playlists by name and/or URI scheme.

- Add edit mode for tracklist.

- Replace tracklist option buttons with popover menu (bye-bye pacman).

- Remove `icomoon` icon font.

- Upgrade `ionic` to v1.0.0-rc2.


0.8.7 2015-04-01
----------------

- Fix mute for Mopidy v1.0 mixer API.


0.8.6 2015-03-25
----------------

- Handle `streamTitleChanged` events.

- Fix exception for missing cover art.


0.8.5 2015-03-24
----------------

- Switch to Mopidy v1.0 ``playlists`` API.

- Use Mopidy.v1.0 `uris` parameter with ``library.lookup()`` and
  ``tracklist.add()``.


0.8.4 2015-03-23
----------------

- Fix search query.

- Adapt `Mopidy.js` shims to Mopidy v1.0 interface.


0.8.3 2015-03-13
----------------

- Add `css/images` to PyPI package.


0.8.2 2015-03-13
----------------

- Fix PyPI package.


0.8.1 2015-03-11
----------------

- Scroll to current track when tracklist tab becomes active.

- Configure cover art cache settings.

- Minor UI improvements.


0.8.0 2015-03-06
----------------

- Add external cover art services.


0.7.1 2015-02-26
----------------

- Minor UI improvements.


0.7.0 2015-02-20
----------------

- Manage multiple server connections in app.

- Prepare for new Mopidy `mixer` API.

- Various UI improvements.


0.6.3 2015-02-12
----------------

- Stability improvements.


0.6.2 2015-02-11
----------------

- Playback time/seek improvements.


0.6.1 2015-02-11
----------------

- Refactor popover menus and handle language change.

- Add `actions` service.


0.6.0 2015-02-10
----------------

- Add `icomoon` icon font.

- Sort playlists by name.

- Add URL to tracklist.

- Error handling.


0.5.1 2015-02-02
----------------

- Configure WebServer URL for use with reverse proxies.

- Bundle `.js` files for faster page loads.

- Use versioned URLs to improve browser caching.


0.5.0 2015-01-30
----------------

- Handle multiple connections in app.

- Implement application logging.


0.4.0 2015-01-29
----------------

- Lookup artist and album search results.

- Merge and sort multiple search results.

- Reload playlists on `event:playlistChanged`.

- Add `debug` setting.

- Add build script for Android app.


0.3.0 2015-01-28
----------------

- Refactor connection service.

- Add ``item-icon-right`` to all collection items.

- CSS cleanup: class names, thumbnail size, menu styles.

- Check for missing resources in `setup.py`.


0.2.2 2015-01-27
----------------

- Change library "add" strategy.


0.2.1 2015-01-27
----------------

- Add missing popovers.


0.2.0 2015-01-27
----------------

- Add connection configuration.

- Fix click in search results.

- Restructure JS source files.

- Various UI improvements/fixes.


0.1.3 2015-01-27
----------------

- Bump version due to PyPi issues.


0.1.2 2015-01-27
----------------

- Fix play/pause toggle button issues.


0.1.1 2015-01-26
----------------

- Fix root search.

- Workaround for play/pause toggle button issues.

- Workaround for reconnect issues.


0.1.0 2015-01-26
----------------

- Initial release.
