package com.platfom.sync

import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorMouseEvent
import com.intellij.openapi.editor.event.EditorMouseListener
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.vfs.VirtualFile
import com.platfom.sync.service.PlatformSyncService
import com.platfom.sync.service.PlatformSyncStatus
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.io.File
import java.net.URI

class FilesDetectionsListener : FileEditorManagerListener {
    private val platformSyncService = PlatformSyncService.getInstance();
    private val socks = WebSocks(platformSyncService, URI("ws://localhost:8123/platform"))
    private val editorEventMulticasts = EditorFactory.getInstance().eventMulticaster
    private var recentLine = -1
    private var recentPath = ""

    init {
        socks.connect()
    }

    private val mouseEditorObserver = object : EditorMouseListener {
        override fun mouseClicked(event: EditorMouseEvent) {
            super.mouseClicked(event)

            val newLinePosition = event.editor.caretModel.currentCaret.logicalPosition.line + 1

            if (socks.isOpen) {
                if (newLinePosition != recentLine) {
                    recentLine = newLinePosition
                    socks.send("reviewerUsername===${platformSyncService.getReviewerUsername()};line===${recentLine}")
                }
            }
        }
    }

    override fun fileClosed(source: FileEditorManager, file: VirtualFile) {
        super.fileClosed(source, file)
        editorEventMulticasts.removeEditorMouseListener(mouseEditorObserver)
    }

    override fun selectionChanged(editorEvent: FileEditorManagerEvent) {
        super.selectionChanged(editorEvent)
        editorEvent.newFile?.let {
            process(editorEvent.manager, it)
        }
    }

    override fun fileOpened(source: FileEditorManager, file: VirtualFile) {
        super.fileOpened(source, file)
        editorEventMulticasts.addEditorMouseListener(mouseEditorObserver)
        process(source, file)
    }

    private fun process(source: FileEditorManager, file: VirtualFile) {
        val baseProjectPath = source.project.basePath?.split("[/\\\\]".toRegex())?.last() ?: File.separator
        val fullPath = file.path
        val projectLocation = fullPath.split(baseProjectPath)[0]
        val filePath = fullPath.replace(projectLocation, "")

        if (socks.isOpen) {
            val newPath = filePath.replace("[/\\\\]".toRegex(), "::")
            if (newPath != recentPath) {
                recentPath = newPath
                socks.send("reviewerUsername===${platformSyncService.getReviewerUsername()};path===${recentPath}")
            }
        }
    }

    class WebSocks(private val platformSyncService: PlatformSyncService, uri: URI) : WebSocketClient(uri) {
        override fun onOpen(handshakedata: ServerHandshake?) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.CONNECTED)
            println("connected, ready to observe")
        }

        override fun onMessage(message: String?) {
            println("incomming $message")
        }

        override fun onClose(code: Int, reason: String?, remote: Boolean) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.DISCONNECTED)
            println("connection close")
        }

        override fun onError(ex: Exception?) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.FAILED_TO_CONNECT)
            println("connection error")
        }
    }
}