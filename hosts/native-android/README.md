# Kotlin host

The application resolves only the verified Maven repository under
`.runtime/sdk/android/maven` and loads its bundled shared miniapp pack. It uses the
SDK View, measured Android layout, native EditText dialogs, bounded state
persistence and asynchronous close. No network or device permissions are added.

Run `node tools/native-consumer-build.mjs --platform android` after exact SDK
installation. Release builds require the same dedicated signing environment as
the Flutter showcase; debug signing never substitutes for it.
