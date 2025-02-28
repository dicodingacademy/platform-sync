package com.platfom.sync.service

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service

@State(name = "PlatformSyncService", storages = [Storage("PlatformSyncService.xml")])
class PlatformSyncService : PersistentStateComponent<PlatformSyncService.State> {

    private val listeners = mutableListOf<() -> Unit>()

    data class State(var reviewerUserName: String? = null, var platformSyncStatus: PlatformSyncStatus = PlatformSyncStatus.FAILED_TO_CONNECT)

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    fun saveReviewerUsername(username: String) {
        state.reviewerUserName = username
        notifyListeners()
    }

    fun getReviewerUsername(): String? = state.reviewerUserName

    fun savePlatformSyncStatus(status: PlatformSyncStatus) {
        state.platformSyncStatus = status
        notifyListeners()
    }

    fun getPlatformSyncStatus(): PlatformSyncStatus = state.platformSyncStatus

    fun addChangeListener(listener: () -> Unit) {
        listeners.add(listener)
    }

    fun removeChangeListener(listener: () -> Unit) {
        listeners.remove(listener)
    }

    private fun notifyListeners() {
        listeners.forEach { it() }
    }

    companion object {
        fun getInstance(): PlatformSyncService = service()
    }
}

enum class PlatformSyncStatus(val description: String) {
    CONNECTED("Connected"),
    DISCONNECTED("Disconnected"),
    FAILED_TO_CONNECT("Failed to Connect")
}