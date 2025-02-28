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
import com.intellij.openapi.application.ApplicationManager

class PlatformSyncStatusBarWidget(project: Project) : EditorBasedWidget(project), StatusBarWidget.MultipleTextValuesPresentation {
    private val webSocketService = WebSocketService.getInstance()
    private var currentPopup: ListPopupImpl? = null

    override fun getTooltipText(): String = "Platform Sync Status"

    override fun getSelectedValue(): String {
        val service = PlatformSyncService.getInstance()
        val username = service.getReviewerUsername() ?: "Not Set"
        val connection = if (webSocketService.isConnected()) "Connected" else "Disconnected"
        return "Platform Sync ($username): $connection"
    }

    override fun getPopup(): ListPopup {
        val isConnected = webSocketService.isConnected()
        val service = PlatformSyncService.getInstance()
        val status = service.getPlatformSyncStatus()

        val menuItems = listOf(
            MenuItem("Set Username", true),
            MenuItem(if (isConnected) "Disconnect" else "Reconnect", true),
        )

        val step = object : BaseListPopupStep<MenuItem>("Platform Sync Actions", menuItems) {
            override fun onChosen(selectedValue: MenuItem?, finalChoice: Boolean): PopupStep<*>? {
                currentPopup?.cancel()

                ApplicationManager.getApplication().invokeLater {
                    when (selectedValue?.text) {
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
                }
                return PopupStep.FINAL_CHOICE
            }

            override fun getTextFor(value: MenuItem): String = value.text
        }

        return ListPopupImpl(step).also {
            currentPopup = it
        }
    }

    private data class MenuItem(val text: String, val enabled: Boolean)

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
        currentPopup?.cancel()
        PlatformSyncService.getInstance().removeChangeListener { statusBar?.updateWidget(ID()) }
        WebSocketService.getInstance().removeChangeListener { statusBar?.updateWidget(ID()) }
    }
}