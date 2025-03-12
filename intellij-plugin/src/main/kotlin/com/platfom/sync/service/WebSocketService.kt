package com.platfom.sync.service

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI

@Service
class WebSocketService {
    private var webSocketClient: WebSocks? = null
    private val platformSyncService = PlatformSyncService.getInstance()
    private val listeners = mutableListOf<() -> Unit>()
    
    fun connect(): Boolean {
        val username = platformSyncService.getReviewerUsername()
        if (username.isNullOrEmpty()) {
            showNotification("Username not set", "Please set your reviewer username before connecting", NotificationType.WARNING)
            return false
        }
        
        disconnect()
        try {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.CONNECTING)
            webSocketClient = WebSocks(platformSyncService, URI(platformSyncService.getWebSocketUrl())).apply {
                connect()
            }
            notifyListeners()
            return true
        } catch (e: Exception) {
            showNotification(
                "Connection Error", 
                "Failed to connect to ${platformSyncService.getWebSocketUrl()}: ${e.message}", 
                NotificationType.ERROR
            )
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.FAILED_TO_CONNECT)
            return false
        }
    }
    
    private fun showNotification(title: String, content: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Platform Sync Notification")
            .createNotification(title, content, type)
            .notify(null)
    }
    
    fun disconnect() {
        webSocketClient?.close()
        webSocketClient = null
        notifyListeners()
    }
    
    fun sendMessage(message: String) {
        if (webSocketClient?.isOpen == true) {
            webSocketClient?.send(message)
        }
    }
    
    fun isConnected() = webSocketClient?.isOpen == true

    fun addChangeListener(listener: () -> Unit) {
        listeners.add(listener)
    }

    fun removeChangeListener(listener: () -> Unit) {
        listeners.remove(listener)
    }

    private fun notifyListeners() {
        listeners.forEach { it() }
    }

    private inner class WebSocks(private val platformSyncService: PlatformSyncService, uri: URI) : WebSocketClient(uri) {
        override fun onOpen(handshakedata: ServerHandshake?) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.CONNECTED)
            println("connected, ready to observe")
            notifyListeners()
        }

        override fun onMessage(message: String?) {
            println("incoming $message")
        }

        override fun onClose(code: Int, reason: String?, remote: Boolean) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.DISCONNECTED)
            println("connection close")
            notifyListeners()
        }

        override fun onError(ex: Exception?) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.FAILED_TO_CONNECT)
            println("connection error")
            notifyListeners()
        }
    }

    companion object {
        fun getInstance(): WebSocketService = service()
    }
}