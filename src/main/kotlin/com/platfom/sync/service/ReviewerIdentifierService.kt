package com.platfom.sync.service

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service

@State(name = "PlatformSyncService", storages = [Storage("PlatformSyncService.xml")])
class PlatformSyncService : PersistentStateComponent<PlatformSyncService.State> {

    data class State(var reviewerUserName: String? = null, var platformSyncStatus: String = PlatformSyncStatus.FAILED_TO_CONNECT.status)

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    fun saveReviewerUsername(username: String) {
        state.reviewerUserName = username
    }

    fun getReviewerUsername(): String? = state.reviewerUserName

    fun savePlatformSyncStatus(status: String) {
        state.platformSyncStatus = status
    }

    fun setPlatformSyncStatus(): String = state.platformSyncStatus

    companion object {
        fun getInstance(): PlatformSyncService = service()
    }
}

enum class PlatformSyncStatus(val status: String) {
    CONNECTED("Connected"),
    FAILED_TO_CONNECT("Failed to Connect")
}