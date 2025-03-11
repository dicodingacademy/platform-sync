package com.platfom.sync.widget

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory

class PlatformSyncStatusBarWidgetFactory : StatusBarWidgetFactory {
    override fun getId(): String = "PlatformSync"
    
    override fun getDisplayName(): String = "Platform Sync"
    
    override fun isAvailable(project: Project): Boolean = true
    
    override fun createWidget(project: Project): StatusBarWidget = PlatformSyncStatusBarWidget(project)
    
    override fun disposeWidget(widget: StatusBarWidget) {
        // No special cleanup needed
    }
    
    override fun canBeEnabledOn(statusBar: com.intellij.openapi.wm.StatusBar): Boolean = true
}