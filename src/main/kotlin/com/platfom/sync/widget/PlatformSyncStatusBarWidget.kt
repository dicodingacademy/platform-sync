package com.platfom.sync.widget

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.ListPopup
import com.intellij.openapi.ui.popup.PopupStep
import com.intellij.openapi.ui.popup.util.BaseListPopupStep
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.impl.status.EditorBasedWidget
import com.intellij.ui.popup.list.ListPopupImpl
import com.platfom.sync.action.ReviewerUsernameInputAction
import com.platfom.sync.service.PlatformSyncService
import com.platfom.sync.service.WebSocketService

class PlatformSyncStatusBarWidget(project: Project) : EditorBasedWidget(project), StatusBarWidget.MultipleTextValuesPresentation {
    private val webSocketService = WebSocketService.getInstance()

    override fun getTooltipText(): String = "Platform Sync Status"

    override fun getSelectedValue(): String {
        val service = PlatformSyncService.getInstance()
        val username = service.getReviewerUsername() ?: "Not Set"
        val connection = if (webSocketService.isConnected()) "Connected" else "Disconnected"
        return "Platform Sync ($username): $connection"
    }

    override fun getPopup(): ListPopup? {
        val isConnected = webSocketService.isConnected()
        val items = mutableListOf("Set Username")
        items.add(if (isConnected) "Disconnect" else "Reconnect")

        val step = object : BaseListPopupStep<String>("Platform Sync Actions", items) {
            override fun onChosen(selectedValue: String?, finalChoice: Boolean): PopupStep<*>? {
                when (selectedValue) {
                    "Set Username" -> {
                        ReviewerUsernameInputAction().actionPerformed(
                            com.intellij.openapi.actionSystem.AnActionEvent.createFromAnAction(
                                ReviewerUsernameInputAction(),
                                null,
                                "StatusBarWidget",
                                com.intellij.openapi.actionSystem.DataContext.EMPTY_CONTEXT
                            )
                        )
                    }
                    "Disconnect" -> webSocketService.disconnect()
                    "Reconnect" -> webSocketService.connect()
                }
                return super.onChosen(selectedValue, finalChoice)
            }
        }
        return ListPopupImpl(step)
    }

    override fun ID(): String = "PlatformSync"

    override fun getPresentation() = this

    override fun install(statusBar: com.intellij.openapi.wm.StatusBar) {
        super.install(statusBar)
        PlatformSyncService.getInstance().addChangeListener {
            statusBar.updateWidget(ID())
        }
        WebSocketService.getInstance().addChangeListener {
            statusBar.updateWidget(ID())
        }
    }

    override fun dispose() {
        super.dispose()
        PlatformSyncService.getInstance().removeChangeListener { statusBar?.updateWidget(ID()) }
        WebSocketService.getInstance().removeChangeListener { statusBar?.updateWidget(ID()) }
    }
}