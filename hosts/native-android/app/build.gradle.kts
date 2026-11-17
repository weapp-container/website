plugins { id("com.android.application") version "8.7.3"; kotlin("android") version "2.0.21" }
android {
    namespace = "dev.weapp.container.showcase.nativehost"
    compileSdk = 36
    defaultConfig {
        applicationId = "dev.weapp.container.showcase.nativehost"
        minSdk = 26; targetSdk = 36; versionCode = 1; versionName = "0.1.0-preview.6.0"
        ndk { abiFilters += setOf("arm64-v8a", "x86_64") }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    // The producer already stripped these libraries. Preserve reviewed bytes.
    packaging { jniLibs { keepDebugSymbols += setOf("**/libweapp_container_sdk.so") } }
    val releaseKeys = listOf("SHOWCASE_KEYSTORE", "SHOWCASE_STORE_PASSWORD", "SHOWCASE_KEY_ALIAS", "SHOWCASE_KEY_PASSWORD")
    val canSign = releaseKeys.all { !System.getenv(it).isNullOrBlank() }
    signingConfigs { if (canSign) create("showcaseRelease") {
        storeFile = file(System.getenv("SHOWCASE_KEYSTORE")); storePassword = System.getenv("SHOWCASE_STORE_PASSWORD")
        keyAlias = System.getenv("SHOWCASE_KEY_ALIAS"); keyPassword = System.getenv("SHOWCASE_KEY_PASSWORD")
    } }
    buildTypes { release {
        if (!canSign && gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }) throw GradleException("Dedicated release signing environment is required")
        if (canSign) signingConfig = signingConfigs.getByName("showcaseRelease")
        isMinifyEnabled = true; isShrinkResources = true
        proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    } }
}
dependencies { implementation("com.sonofmagic.weapp:weapp-container-android:0.1.0-preview.6.0") }
