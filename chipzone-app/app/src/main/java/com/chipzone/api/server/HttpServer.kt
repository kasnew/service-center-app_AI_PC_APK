package com.chipzone.api.server

import android.content.Context
import android.util.Log
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import java.net.InetAddress
import java.net.NetworkInterface
import java.security.KeyStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HttpServer @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val apiRoutes: ApiRoutes
) {
    private var server: ApplicationEngine? = null
    private val serverScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var serverPort: Int = 8443
    private var serverIp: String = ""
    private var bearerToken: String = ""
    
    fun getBearerToken(): String = bearerToken
    
    private fun getLocalIpAddress(): String? {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is java.net.Inet4Address) {
                        return address.hostAddress
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("HttpServer", "Error getting local IP: ${e.message}", e)
        }
        return null
    }
    
    fun startServer(port: Int = 8443, token: String): Result<String> {
        return try {
            Log.d("HttpServer", "startServer() called with port=$port")
            
            if (server != null) {
                Log.w("HttpServer", "Server already running")
                return Result.failure(Exception("Server already running"))
            }
            
            serverPort = port
            bearerToken = token
            Log.d("HttpServer", "Port and token set")
            
            // Get local IP address
            try {
                val wifiManager = appContext.applicationContext.getSystemService(android.content.Context.WIFI_SERVICE) as? android.net.wifi.WifiManager
                if (wifiManager != null) {
            val ipAddress = wifiManager.connectionInfo.ipAddress
                    if (ipAddress != 0) {
            serverIp = String.format(
                "%d.%d.%d.%d",
                ipAddress and 0xff,
                ipAddress shr 8 and 0xff,
                ipAddress shr 16 and 0xff,
                ipAddress shr 24 and 0xff
            )
                    } else {
                        // Fallback: try to get IP from network interfaces
                        serverIp = getLocalIpAddress() ?: "127.0.0.1"
                    }
                } else {
                    serverIp = getLocalIpAddress() ?: "127.0.0.1"
                }
            } catch (e: Exception) {
                Log.e("HttpServer", "Error getting IP address: ${e.message}", e)
                serverIp = getLocalIpAddress() ?: "127.0.0.1"
            }
            
            // Use HTTP instead of HTTPS for easier access
            val currentServerIp = serverIp
            val currentToken = bearerToken
            val currentPort = serverPort
            
            Log.d("HttpServer", "Creating server on $currentServerIp:$currentPort")
            
            // Use Netty instead of CIO (CIO may have issues on Android)
            // Run server creation in a separate thread to avoid blocking
            var serverCreationError: Exception? = null
            val creationLatch = java.util.concurrent.CountDownLatch(1)
            
            Thread {
                try {
                    Log.d("HttpServer", "Calling embeddedServer(Netty) in background thread...")
                    server = embeddedServer(Netty, host = "0.0.0.0", port = currentPort) {
                        Log.d("HttpServer", "Inside embeddedServer lambda, setting up configuration...")
                        try {
                            setupServerConfiguration(currentServerIp, currentToken, currentPort)
                            Log.d("HttpServer", "Server configuration setup completed")
                        } catch (e: Exception) {
                            Log.e("HttpServer", "Error in setupServerConfiguration: ${e.message}", e)
                            e.printStackTrace()
                            throw e
                        }
                    }
                    Log.d("HttpServer", "Server instance created successfully")
                } catch (e: Exception) {
                    Log.e("HttpServer", "Failed to create server instance: ${e.message}", e)
                    e.printStackTrace()
                    serverCreationError = e
                } finally {
                    creationLatch.countDown()
                }
            }.start()
            
            // Wait for server creation (max 3 seconds)
            val created = creationLatch.await(3, java.util.concurrent.TimeUnit.SECONDS)
            
            if (!created) {
                Log.e("HttpServer", "Server creation timeout")
                return Result.failure(Exception("Server creation timeout"))
            }
            
            if (serverCreationError != null) {
                Log.e("HttpServer", "Server creation failed: ${serverCreationError!!.message}")
                return Result.failure(serverCreationError!!)
            }
            
            if (server == null) {
                Log.e("HttpServer", "Server is null after creation")
                return Result.failure(Exception("Failed to create server instance"))
            }
            
            Log.d("HttpServer", "Server instance created, starting...")
            
            // Start server in background - don't wait, return immediately
            Log.d("HttpServer", "Launching coroutine to start server...")
            serverScope.launch {
                try {
                    Log.d("HttpServer", "Inside coroutine, calling server.start()...")
                    server?.start(wait = false)
                    Log.d("HttpServer", "Server started successfully on $serverIp:$serverPort")
                } catch (e: Exception) {
                    Log.e("HttpServer", "Error starting server: ${e.message}", e)
                    e.printStackTrace()
                    server = null
                }
            }
            
            // Return immediately - server will start in background
            // The server instance is created, so we can return success
            Log.d("HttpServer", "Server creation completed, starting in background. URL: http://$serverIp:$serverPort")
            Result.success("http://$serverIp:$serverPort")
        } catch (e: Exception) {
            Log.e("HttpServer", "Failed to start server: ${e.message}", e)
            e.printStackTrace()
            Result.failure(e)
        }
    }
    
    private fun Application.setupServerConfiguration(serverIp: String, bearerToken: String, serverPort: Int) {
        val appContext = this@HttpServer.appContext
        // Store values in closure for use in endpoints
        val currentServerIp = serverIp
        val currentServerPort = serverPort
        val currentBearerToken = bearerToken
                install(ContentNegotiation) {
                    json(Json {
                        prettyPrint = true
                        isLenient = true
                        ignoreUnknownKeys = true
                    })
                }
                
                install(CORS) {
                    allowMethod(HttpMethod.Options)
                    allowMethod(HttpMethod.Get)
                    allowMethod(HttpMethod.Post)
                    allowMethod(HttpMethod.Put)
                    allowMethod(HttpMethod.Delete)
                    allowHeader(HttpHeaders.Authorization)
                    allowHeader(HttpHeaders.ContentType)
                    allowSameOrigin = false
                    allowCredentials = true
            // Allow localhost and detected server IP
                    allowHost("localhost")
                    allowHost("127.0.0.1")
            if (currentServerIp.isNotEmpty()) {
                allowHost(currentServerIp)
            }
            // For local network access, we'll use anyHost() but this is acceptable for local development
            // In production, you might want to restrict this further
            anyHost() // Allow all hosts for local network access
                }
                
                install(Authentication) {
                    bearer("auth-bearer") {
                        realm = "Service Center API"
                        authenticate { tokenCredential ->
                    if (tokenCredential.token == currentBearerToken) {
                                UserIdPrincipal("authenticated")
                            } else {
                                null
                            }
                        }
                    }
                }
                
                routing {
                    // Public endpoints
                    get("/") {
                try {
                    val assetManager = appContext.assets
                    val inputStream = assetManager.open("web/index.html")
                    val content = inputStream.readBytes()
                    inputStream.close()
                    call.respondBytes(content, ContentType.Text.Html)
                    Log.d("HttpServer", "Served index.html")
                } catch (e: Exception) {
                    Log.e("HttpServer", "Error serving index.html: ${e.message}", e)
                    call.respond(HttpStatusCode.NotFound, "File not found")
                }
                    }
                    
                    // Serve static files from assets
                    get("/web/{path...}") {
                        val path = call.parameters.getAll("path")?.joinToString("/") ?: ""
                        try {
                    val assetManager = appContext.assets
                            val inputStream = assetManager.open("web/$path")
                            val content = inputStream.readBytes()
                            inputStream.close()
                            
                            val contentType = when {
                                path.endsWith(".css") -> ContentType.Text.CSS
                                path.endsWith(".js") -> ContentType.Application.JavaScript
                                path.endsWith(".html") -> ContentType.Text.Html
                                path.endsWith(".png") -> ContentType.Image.PNG
                                path.endsWith(".jpg") || path.endsWith(".jpeg") -> ContentType.Image.JPEG
                                else -> ContentType.Text.Plain
                            }
                            
                            call.respondBytes(content, contentType)
                        } catch (e: Exception) {
                            call.respond(HttpStatusCode.NotFound, "File not found")
                        }
                    }
                    
                    get("/api/ping") {
                        call.respond(mapOf("status" to "ok", "version" to "1.0.0"))
                    }
                    
                    get("/api/version") {
                        call.respond(mapOf("version" to "1.0.0"))
                    }
                    
            // Get server info (IP and port) - public endpoint
            get("/api/server-info") {
                try {
                    android.util.Log.d("HttpServer", "server-info endpoint called")
                    android.util.Log.d("HttpServer", "currentServerIp: '$currentServerIp'")
                    android.util.Log.d("HttpServer", "currentServerPort: $currentServerPort")
                    android.util.Log.d("HttpServer", "currentBearerToken empty: ${currentBearerToken.isEmpty()}")
                    
                    val tokenPreview = if (currentBearerToken.isNotEmpty()) {
                        try {
                            currentBearerToken.take(10) + "..."
                        } catch (e: Exception) {
                            "error getting preview"
                    }
                    } else {
                        "empty"
                    }
                    
                    android.util.Log.d("HttpServer", "Token preview: $tokenPreview")
                    
                    if (currentServerIp.isEmpty() || currentBearerToken.isEmpty()) {
                    android.util.Log.e("HttpServer", "Server info not initialized: IP='$currentServerIp', Token empty=${currentBearerToken.isEmpty()}")
                    val errorJson = """
                        {
                            "error": "Server not properly initialized",
                            "message": "Server IP or token not set",
                            "ip": "$currentServerIp",
                            "port": $currentServerPort,
                            "tokenEmpty": ${currentBearerToken.isEmpty()}
                        }
                    """.trimIndent()
                    call.respondText(errorJson, ContentType.Application.Json, HttpStatusCode.InternalServerError)
                        return@get
                    }
                    
                    android.util.Log.d("HttpServer", "Sending response: ip=$currentServerIp, port=$currentServerPort")
                    
                    // Use respondText with manual JSON to avoid serialization issues
                    val jsonResponse = """
                        {
                            "ip": "$currentServerIp",
                            "port": $currentServerPort,
                            "url": "http://$currentServerIp:$currentServerPort",
                            "token": "$currentBearerToken"
                        }
                    """.trimIndent()
                    
                    call.respondText(jsonResponse, ContentType.Application.Json)
                    android.util.Log.d("HttpServer", "server-info response sent successfully")
        } catch (e: Exception) {
                    android.util.Log.e("HttpServer", "Error in server-info endpoint: ${e.message}", e)
                    e.printStackTrace()
                    try {
                        val errorJson = """
                            {
                                "error": "Internal server error",
                                "message": "${(e.message ?: "Unknown error").replace("\"", "\\\"")}",
                                "exception": "${e.javaClass.simpleName}"
                            }
                        """.trimIndent()
                        call.respondText(errorJson, ContentType.Application.Json, HttpStatusCode.InternalServerError)
                    } catch (e2: Exception) {
                        android.util.Log.e("HttpServer", "Failed to send error response: ${e2.message}", e2)
                    }
                }
            }
            
            // Protected API routes
            authenticate("auth-bearer") {
                apiRoutes.setupRoutes(this@routing)
            }
        }
    }
    
    fun stopServer() {
        Log.d("HttpServer", "stopServer() called")
        serverScope.launch {
            try {
                Log.d("HttpServer", "Stopping server...")
            server?.stop(1000, 2000)
            server = null
                Log.d("HttpServer", "Server stopped")
            } catch (e: Exception) {
                Log.e("HttpServer", "Error stopping server: ${e.message}", e)
            }
        }
    }
    
    fun isRunning(): Boolean {
        val running = server != null
        Log.d("HttpServer", "isRunning() called, returning: $running")
        return running
    }
    
    fun getServerInfo(): Pair<String, Int>? {
        val info = if (server != null) Pair(serverIp, serverPort) else null
        Log.d("HttpServer", "getServerInfo() called, returning: $info")
        return info
    }
}

