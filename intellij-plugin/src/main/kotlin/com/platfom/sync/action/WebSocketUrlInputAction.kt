package com.platfom.sync.action

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages
import com.platfom.sync.service.PlatformSyncService
import com.platfom.sync.service.WebSocketService

class WebSocketUrlInputAction : AnAction("WebSocket URL Input") {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project
        val service = PlatformSyncService.getInstance()
        val webSocketService = WebSocketService.getInstance()

        val input = Messages.showInputDialog(
            project,
            "Input WebSocket URL",
            "WebSocket URL",
            Messages.getQuestionIcon(),
            service.getWebSocketUrl(),
            null
        )

        if (!input.isNullOrEmpty()) {
            service.saveWebSocketUrl(input)
            if (webSocketService.isConnected()) {
                webSocketService.disconnect()
                webSocketService.connect()
            }
        }
    }

    override fun update(e: AnActionEvent) {
        val url = PlatformSyncService.getInstance().getWebSocketUrl()
        e.presentation.text = "WebSocket URL: $url"
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT
}