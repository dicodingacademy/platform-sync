# platform-sync


## Download
Download atau clone project, setelah selesai ikuti panduan untuk setup SDK di [Setting Up Environment](https://plugins.jetbrains.com/docs/intellij/setting-up-environment.html#preliminary-steps)

## Config
Buka kelas `FilesDetectionsListener` kemudian sesuaikan url untuk endpoint firebase.
```kotlin
val request =
    Request.Builder().url("https://replace-with-ur-own.firebaseio.com/location.json").put(body).build()
```

## Build Plugin
* Masuk tab gradle di kanan atas
* Kemudian pilih `platform-sync` -> `Tasks` -> `intellij` -> `buildPlugin`
* Tunggu sampai selesai

## Install Plugin
* Masuk pengaturan Android Studio -> Pengaturan Plugin
* Klik icon gear yang ada di atas kemudian pilih `install from disk...`.
* Arahkan folder ke hasil build plugin. Biasanya ada di dalam folder `build` -> `distributions`
* Refresh!
