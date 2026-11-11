# Native showcase

One Flutter project targets Android, iOS, macOS, Windows and Linux. It embeds the
native QuickJS/Skia SDK. The host owns native text editing, durable demo state,
measured layout and awaited session close. Bridge messages follow
`miniapp/BRIDGE.md`; replies retain the guest session, page and request identities.

Install a matching restricted Flutter SDK distribution into `.runtime/sdk/flutter`,
then run `node tools/native-build.mjs --platform android`. The builder synchronizes
the shared `artifacts/miniapp/pack`; the app exposes no arbitrary pack loader.

Release Android uses an independent keystore and R8; Flutter release builds use
`--obfuscate` with private symbol output. iOS Simulator debug builds are separate
development checks. Apple device signing and macOS notarization require their
own configured identities.
