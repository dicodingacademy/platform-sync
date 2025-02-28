package com.platfom.sync.service

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI

@Service
class WebSocketService {
    private val listeners = mutableListOf<() -> Unit>()
    private var webSocketClient: WebSocks? = null
    private val platformSyncService = PlatformSyncService.getInstance()
    
    fun connect() {
        disconnect()
        webSocketClient = WebSocks(platformSyncService) { notifyListeners() }.apply {
            connect()
        }
        notifyListeners()
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

    private class WebSocks(
        private val platformSyncService: PlatformSyncService,
        private val onStateChange: () -> Unit
    ) : WebSocketClient(URI("wss://platform-sync-websocket.onrender.com")) {
        override fun onOpen(handshakedata: ServerHandshake?) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.CONNECTED)
            onStateChange()
            println("connected, ready to observe")
        }

        override fun onMessage(message: String?) {
            println("incoming $message")
        }

        override fun onClose(code: Int, reason: String?, remote: Boolean) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.DISCONNECTED)
            onStateChange()
            println("connection close")
        }

        override fun onError(ex: Exception?) {
            platformSyncService.savePlatformSyncStatus(PlatformSyncStatus.FAILED_TO_CONNECT)
            onStateChange()
            println("connection error")
        }
    }

    companion object {
        fun getInstance(): WebSocketService = service()
    }
}