#!/bin/sh
#
# Usage: release-apk.sh KEYSTORE ALIAS [INFILE OUTFILE]
#
JARSIGNER="jarsigner"
ZIPALIGN="$ANDROID_HOME/build-tools/21.1.2/zipalign"
INFILE="${3:-platforms/android/ant-build/CordovaApp-release-unsigned.apk}"
OUTFILE="${4:-platforms/android/ant-build/CordovaApp-release.apk}"

"$JARSIGNER" -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$1" "$INFILE" "$2"
"$ZIPALIGN" -v -f 4 "$INFILE" "$OUTFILE"
