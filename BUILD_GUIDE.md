# Build & Run Guide for Ma7fzty

This guide contains the necessary commands and tools required to build, run, and submit the Ma7fzty app.

## 1. Prerequisites (Tools to Install)

To work with this Expo project, you need the following tools installed on your machine:

- **Node.js (LTS)**: [Download here](https://nodejs.org/)
- **Git**: [Download here](https://git-scm.com/)
- **EAS CLI**: Run `npm install -g eas-cli` in your terminal.
- **Android Studio + JDK 17**: Required for local development builds (`npx expo run:android`).

> [!IMPORTANT]
> **Expo Go is no longer supported for this project.** The app uses native modules (`expo-speech-recognition`, `@react-native-voice/voice`) that are not bundled in Expo Go. You must use a **development build** (custom dev client) instead — see below.

---

## 2. Running the App (Development Build)

This project uses `expo-dev-client`, which means you need to install a custom development build on your device/emulator **once**, then you can use `npx expo start` for fast JS reloading on top of it.

### Step 1 — Install the dev build (one time per device)

**Option A: Local build (requires Android Studio + JDK 17)**

```bash
npm install
npx expo run:android
```

This compiles the native Android app and installs it on your connected device/emulator.

**Option B: Cloud dev build (no Android Studio needed)**

```bash
npx eas login   # only once
npx eas build --profile development --platform android
```

EAS returns a download link — install the resulting APK on your phone.

### Step 2 — Start the dev server

```bash
npx expo start -c
```

Open the **Ma7fzty dev build** app on your phone (NOT Expo Go) and it will connect to the dev server.

---

## 3. Building the App (EAS Cloud Build) ☁️

### For Testing (APK)

```bash
# Login to your Expo account (only once)
npx eas login

# Start the build process for Android (generates an APK)
npx eas build --platform android --profile preview
```

### For Production (App Bundle)

```bash
# Configure your project (only once)
npx eas build:configure

# Build for production (generates an .aab)
npx eas build --platform android --profile production
```

### Submit to Play Store

```bash
# Submit your production build
npx eas submit --platform android
```

---

## 4. Building the App (Option 2: Local Native Build - Advanced) 💻

To build the APK entirely on your machine, you must have **Android Studio** and **Java (JDK 17)** configured.

### Generate the Native Android Project
If you haven't already, generate the `android/` directory:
```bash
npx expo prebuild --platform android
```

### Build the APK
You can use the convenience scripts added to `package.json`:

#### For Debugging (Quick Test)
```bash
npm run android:build:debug
```
- **Output Path**: `android/app/build/outputs/apk/debug/app-debug.apk`

#### For Release (Production APK)
```bash
npm run android:build:release
```
- **Output Path**: `android/app/build/outputs/apk/release/app-release.apk`

#### For Production (Google Play Bundle - .aab)
```bash
npm run android:build:bundle
```
- **Output Path**: `android/app/build/outputs/bundle/release/app-release.aab`

### Run on Device
To run the app directly on a connected Android device or emulator:
```bash
npx expo run:android
```

---

## 5. Required Native Modules

The following native modules are used in this app and require a rebuild if changed:

- `expo-camera`: For receipt photo capture.
- `expo-notifications`: For daily reminders.
- `expo-image-picker`: For gallery access.
- `expo-speech-recognition`: For voice dictation in Quick Add Note.
- `@react-native-voice/voice`: Additional voice input support.
- `@react-native-community/datetimepicker`: For selecting reminder times.
- `expo-constants`: For app configuration metadata.
- `expo-device`: For identifying device information.

> Any time these change, the dev client APK must be rebuilt (re-run `npx expo run:android` or a new EAS development build).

---

## 5. Troubleshooting 🛠️

### SDK location not found
If you see an error like `SDK location not found`, ensure you have a `android/local.properties` file with the correct path to your Android SDK:
```properties
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```
*(Note: Use double backslashes `\\` and escape colons `\:` on Windows)*

---

---

## 6. Signing Configuration (Local Build) 🔑

The local build is configured to use a release keystore for signing the `.aab` and `.apk` files.

- **Keystore Path**: `android/app/my-upload-key.keystore`
- **Alias**: `my-key-alias`
- **Passwords**: Configured in `android/gradle.properties`

> [!IMPORTANT]
> Keep the `my-upload-key.keystore` file and its passwords safe. You will need them to sign every update to the app.

---

> [!TIP]
> Always use `npx expo start -c` when you install new packages to ensure the packager sees the latest changes.
