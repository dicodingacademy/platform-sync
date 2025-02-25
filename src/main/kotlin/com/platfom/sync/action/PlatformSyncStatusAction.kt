package com.platfom.sync.action

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.platfom.sync.service.PlatformSyncService

class PlatformSyncStatusAction : AnAction("Status") {

    override fun update(e: AnActionEvent) {
        val service = PlatformSyncService.getInstance()
        val status = service.getPlatformSyncStatus()
        e.presentation.text = "Status: ${status.description}"
    }

    override fun actionPerformed(e: AnActionEvent) {
        // Not Needed for this action
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT
}