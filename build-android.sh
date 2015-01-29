#!/bin/sh
#
# Usage: build-android.sh [KEYSTORE ALIAS]
#
CORDOVA="cordova"
JARSIGNER="jarsigner"
ZIPALIGN="$ANDROID_HOME/build-tools/21.1.2/zipalign"
APK="platforms/android/ant-build/CordovaApp-release-unsigned.apk"

"$CORDOVA" build --release android
if [ $# -ge 2 ]; then
    "$JARSIGNER" -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$1" "$APK" "$2"
fi
"$ZIPALIGN" -v 4 "$APK" mopidy-mobile.apk
