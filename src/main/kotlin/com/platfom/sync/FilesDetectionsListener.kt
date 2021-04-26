package com.platfom.sync

import com.intellij.openapi.fileEditor.*
import com.intellij.openapi.vfs.VirtualFile
import okhttp3.*
import java.io.File
import java.util.concurrent.Executors

class FilesDetectionsListener : FileEditorManagerListener {

    private val httpClient = OkHttpClient()
    private lateinit var shoutRequest: Call

    override fun selectionChanged(event: FileEditorManagerEvent) {
        super.selectionChanged(event)
        event.newFile?.let {
            process(event.manager, it)
        }
    }

    override fun fileOpened(source: FileEditorManager, file: VirtualFile) {
        super.fileOpened(source, file)

        process(source, file)
    }

    private fun process(source: FileEditorManager, file: VirtualFile) {
        val baseProjectPath = source.project.basePath?.split(File.separator)?.last() ?: File.separator
        val fullPath = file.path

        val projectLocation = fullPath.split(baseProjectPath)[0]
        val filePath = fullPath.replace(projectLocation, "")
        Executors.newSingleThreadExecutor().execute {
            run(filePath.replace(File.separator, "::"))
        }
    }

    private fun run(path: String) {
        if (this::shoutRequest.isInitialized){
            shoutRequest.cancel()
        }

        val json = "{ \"path\": \"$path\" }"
        val body = RequestBody.create(MediaType.parse("application/json; charset=utf-8"), json)
        val request =
            Request.Builder().url("https://replace-with-ur-own.firebaseio.com/location.json").put(body).build()
        shoutRequest = httpClient.newCall(request)
        shoutRequest.execute()
    }
}