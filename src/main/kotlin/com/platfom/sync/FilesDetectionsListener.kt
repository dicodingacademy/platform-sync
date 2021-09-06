package com.platfom.sync

import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.EditorMouseEvent
import com.intellij.openapi.editor.event.EditorMouseListener
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.vfs.VirtualFile
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.io.File
import java.net.URI

class FilesDetectionsListener : FileEditorManagerListener, Disposable{
    private val socks = WebSocks(URI("ws://localhost:8123/platform"))
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
                    socks.send("line===${recentLine}")
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
        process(source, file)

        editorEventMulticasts.addEditorMouseListener(mouseEditorObserver, this)
    }

    private fun process(source: FileEditorManager, file: VirtualFile) {
        val baseProjectPath = source.project.basePath?.split("[\\/\\\\]".toRegex())?.last() ?: File.separator
        val fullPath = file.path
        val projectLocation = fullPath.split(baseProjectPath)[0]
        val filePath = fullPath.replace(projectLocation, "")

        if (socks.isOpen) {
            val newPath = filePath.replace("[\\/\\\\]".toRegex(), "::")
            if (newPath != recentPath) {
                recentPath = newPath
                socks.send("path===${recentPath}")
            }
        }
    }

    override fun dispose() {
        editorEventMulticasts.removeEditorMouseListener(mouseEditorObserver)
    }

    class WebSocks(uri: URI) : WebSocketClient(uri) {
        override fun onOpen(handshakedata: ServerHandshake?) {
            println("connected, ready to observe")
        }

        override fun onMessage(message: String?) {
            println("incomming $message")
        }

        override fun onClose(code: Int, reason: String?, remote: Boolean) {
            println("connection close")
        }

        override fun onError(ex: Exception?) {
            println("connection error")
        }
    }
}