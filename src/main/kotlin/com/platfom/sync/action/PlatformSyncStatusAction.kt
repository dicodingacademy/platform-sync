package com.platfom.sync.action

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.platfom.sync.service.PlatformSyncService
import com.platfom.sync.service.WebSocketService

class PlatformSyncStatusAction : AnAction("Status") {
    private val webSocketService = WebSocketService.getInstance()

    override fun update(e: AnActionEvent) {
        val service = PlatformSyncService.getInstance()
        val status = service.getPlatformSyncStatus()
        val isConnected = webSocketService.isConnected()
        e.presentation.text = "Status: ${status.description} (Click to ${if (isConnected) "Disconnect" else "Reconnect"})"
    }

    override fun actionPerformed(e: AnActionEvent) {
        if (webSocketService.isConnected()) {
            webSocketService.disconnect()
        } else {
            webSocketService.connect()
        }
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT
}