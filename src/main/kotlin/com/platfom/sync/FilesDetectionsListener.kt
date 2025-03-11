package com.platfom.sync

import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorMouseEvent
import com.intellij.openapi.editor.event.EditorMouseListener
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.vfs.VirtualFile
import com.platfom.sync.service.PlatformSyncService
import com.platfom.sync.service.WebSocketService
import java.io.File

class FilesDetectionsListener : FileEditorManagerListener {
    private val platformSyncService = PlatformSyncService.getInstance()
    private val webSocketService = WebSocketService.getInstance()
    private val editorEventMulticaster = EditorFactory.getInstance().eventMulticaster
    private var recentLine = -1
    private var recentPath = ""

    init {
        webSocketService.connect()
    }

    private val mouseEditorObserver = object : EditorMouseListener {
        override fun mouseClicked(event: EditorMouseEvent) {
            val logicalPosition = event.editor.caretModel.logicalPosition.line + 1
            if (logicalPosition != recentLine) {
                recentLine = logicalPosition
                if (webSocketService.isConnected()) {
                    webSocketService.sendMessage("reviewerUsername===${platformSyncService.getReviewerUsername()};line===$recentLine")
                }
            }
        }
    }

    override fun selectionChanged(event: FileEditorManagerEvent) {
        val source = event.manager
        val file = event.newFile ?: return

        editorEventMulticaster.addEditorMouseListener(mouseEditorObserver)
        process(source, file)
    }

    private fun process(source: FileEditorManager, file: VirtualFile) {
        val baseProjectPath = source.project.basePath?.split("[/\\\\]".toRegex())?.last() ?: File.separator
        val fullPath = file.path
        val projectLocation = fullPath.split(baseProjectPath)[0]
        val filePath = fullPath.replace(projectLocation, "")

        if (webSocketService.isConnected()) {
            val newPath = filePath.replace("[/\\\\]".toRegex(), "::")
            if (newPath != recentPath) {
                recentPath = newPath
                webSocketService.sendMessage("reviewerUsername===${platformSyncService.getReviewerUsername()};path===${recentPath}")
            }
        }
    }
}