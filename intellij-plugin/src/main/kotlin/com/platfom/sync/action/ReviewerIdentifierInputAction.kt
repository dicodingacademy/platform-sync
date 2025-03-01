package com.platfom.sync.action

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages
import com.platfom.sync.service.PlatformSyncService

class ReviewerUsernameInputAction : AnAction("Reviewer Username Input") {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project
        val service = PlatformSyncService.getInstance()

        val input = Messages.showInputDialog(
            project,
            "Input your username",
            "Reviewer Username",
            Messages.getQuestionIcon()
        )

        if (!input.isNullOrEmpty()) {
            service.saveReviewerUsername(input)
        }
    }

    override fun update(e: AnActionEvent) {
        val storedData = PlatformSyncService.getInstance().getReviewerUsername()
        e.presentation.text = if (storedData.isNullOrEmpty()) "Input Your Username" else "Reviewer Username: $storedData"
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT
}
