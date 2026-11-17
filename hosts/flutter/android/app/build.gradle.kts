plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "dev.weapp.container.container_showcase"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.1.12297006"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // The native producer already stripped the reviewed runtime library.
    packaging { jniLibs { keepDebugSymbols += setOf("**/libweapp_container_sdk.so") } }

    defaultConfig {
        applicationId = "dev.weapp.container.showcase"
        minSdk = 26
        ndk { abiFilters += setOf("arm64-v8a", "x86_64") }
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    val releaseEnvironment = listOf("SHOWCASE_KEYSTORE", "SHOWCASE_STORE_PASSWORD", "SHOWCASE_KEY_ALIAS", "SHOWCASE_KEY_PASSWORD")
    val hasReleaseKey = releaseEnvironment.all { !System.getenv(it).isNullOrBlank() }
    signingConfigs {
        if (hasReleaseKey) create("showcaseRelease") {
            storeFile = file(System.getenv("SHOWCASE_KEYSTORE"))
            storePassword = System.getenv("SHOWCASE_STORE_PASSWORD")
            keyAlias = System.getenv("SHOWCASE_KEY_ALIAS")
            keyPassword = System.getenv("SHOWCASE_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            if (!hasReleaseKey && gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }) {
                throw GradleException("A dedicated showcase release keystore is required; run tools/native-signing.mjs --create")
            }
            if (hasReleaseKey) signingConfig = signingConfigs.getByName("showcaseRelease")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
