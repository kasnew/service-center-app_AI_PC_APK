package com.servicecenter.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.size
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.servicecenter.data.api.ApiClient
import com.servicecenter.data.local.PreferencesKeys
import com.servicecenter.data.models.ServerConfig
import com.servicecenter.ui.components.ConnectionIndicator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import java.util.Collections
import com.servicecenter.data.sync.SyncManager
import javax.inject.Inject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val servers by viewModel.servers.collectAsState(initial = emptyList())
    val activeServer by viewModel.activeServer.collectAsState(initial = null)
    val isConnected by viewModel.isConnected.collectAsState(initial = false)
    val isChecking by viewModel.isChecking.collectAsState(initial = false)
    val isOfflineMode by viewModel.isOfflineMode.collectAsState(initial = false)
    var showAddServerDialog by remember { mutableStateOf(false) }
    var editingServer by remember { mutableStateOf<ServerConfig?>(null) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Налаштування") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    ConnectionIndicator()
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddServerDialog = true }
            ) {
                Icon(Icons.Default.Add, contentDescription = "Додати сервер")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Offline Mode Switch
            item {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isOfflineMode) 
                            MaterialTheme.colorScheme.tertiaryContainer 
                        else 
                            androidx.compose.ui.graphics.Color.White
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = if (isOfflineMode) Icons.Default.CloudOff else Icons.Default.CloudQueue,
                                contentDescription = null,
                                tint = if (isOfflineMode) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Column {
                                Text(
                                    text = "Автономний режим",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = if (isOfflineMode) "Мережеві запити вимкнено" else "Синхронізація активна",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (isOfflineMode) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = isOfflineMode,
                            onCheckedChange = { viewModel.setOfflineMode(it) }
                        )
                    }
                }
            }
            
            // Autostart Switch
            item {
                val isAutoStartEnabled by viewModel.isAutoStartEnabled.collectAsState()
                Card(
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = androidx.compose.ui.graphics.Color.White
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Launch,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Column {
                                Text(
                                    text = "Автозапуск",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Запускати додаток після перезавантаження",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = isAutoStartEnabled,
                            onCheckedChange = { viewModel.setAutoStartEnabled(it) }
                        )
                    }
                }
            }
            
            // Connection status card
            item {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isConnected) 
                            androidx.compose.ui.graphics.Color.White
                        else 
                            androidx.compose.ui.graphics.Color.White
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            val color = if (isConnected) 
                                MaterialTheme.colorScheme.primary 
                            else 
                                MaterialTheme.colorScheme.error
                            
                            if (isChecking) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    strokeWidth = 2.dp,
                                    color = color
                                )
                            } else {
                                Icon(
                                    imageVector = if (isConnected) 
                                        Icons.Default.CheckCircle 
                                    else 
                                        Icons.Default.Error,
                                    contentDescription = null,
                                    tint = color,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = activeServer?.name ?: "Сервер не вибрано",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = when {
                                        isChecking -> "Перевірка..."
                                        isOfflineMode -> "Офлайн"
                                        isConnected -> "Підключено"
                                        activeServer != null -> "Не підключено"
                                        else -> "Додайте сервер"
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = color
                                )
                                // Show error message if exists
                                val connectionError by viewModel.connectionError.collectAsState()
                                if (connectionError != null && !isConnected && !isChecking) {
                                    Text(
                                        text = connectionError!!,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                            }
                        }
                        if (activeServer != null) {
                            IconButton(
                                onClick = { viewModel.checkConnection(force = true) },
                                enabled = !isChecking
                            ) {
                                Icon(
                                    Icons.Default.Refresh,
                                    contentDescription = "Перевірити",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
            
            items(servers) { server ->
                val isServerConnected = if (server.id == activeServer?.id) {
                    isConnected
                } else {
                    viewModel.serverStatuses.collectAsState().value[server.id] ?: false
                }
                
                ServerItem(
                    server = server,
                    isActive = server.id == activeServer?.id,
                    isConnected = isServerConnected,
                    onSelect = { viewModel.setActiveServer(server.id) },
                    onEdit = { editingServer = server },
                    onDelete = { viewModel.deleteServer(server.id) }
                )
            }
            
            if (servers.isEmpty()) {
                item {
                    Card {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.CloudOff,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "Немає збережених серверів",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "Натисніть + щоб додати сервер",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
        
        // Add/Edit server dialog
        if (showAddServerDialog || editingServer != null) {
            ServerDialog(
                server = editingServer,
                onDismiss = {
                    showAddServerDialog = false
                    editingServer = null
                },
                onSave = { name, url ->
                    if (editingServer != null) {
                        viewModel.updateServer(editingServer!!.id, name, url)
                    } else {
                        viewModel.addServer(name, url)
                    }
                    showAddServerDialog = false
                    editingServer = null
                },
                viewModel = viewModel
            )
        }
    }
}

@Composable
fun ServerItem(
    server: ServerConfig,
    isActive: Boolean,
    isConnected: Boolean,
    onSelect: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    
    Card(
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) 
                androidx.compose.ui.graphics.Color(0xFFE3F2FD)
            else 
                androidx.compose.ui.graphics.Color.White
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                RadioButton(
                    selected = isActive,
                    onClick = onSelect
                )
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = server.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                            color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                        Icon(
                            imageVector = Icons.Default.Circle,
                            contentDescription = null,
                            modifier = Modifier.size(8.dp),
                            tint = if (isConnected) Color(0xFF4CAF50) else Color(0xFFF44336)
                        )
                        if (isActive && isConnected) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    Text(
                        text = server.url,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                IconButton(onClick = onEdit) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = "Редагувати",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Видалити",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
    
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Видалити сервер?") },
            text = { Text("Ви впевнені, що хочете видалити \"${server.name}\"?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete()
                        showDeleteDialog = false
                    }
                ) {
                    Text("Видалити", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Скасувати")
                }
            }
        )
    }
}

@Composable
fun ServerDialog(
    server: ServerConfig?,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit,
    viewModel: SettingsViewModel
) {
    var name by remember { mutableStateOf(server?.name ?: "") }
    var url by remember { mutableStateOf(server?.url ?: "") }
    val isScanning by viewModel.isScanning.collectAsState()
    
    // Auto-fill IP prefix if empty and adding new server
    LaunchedEffect(Unit) {
        if (server == null && url.isEmpty()) {
            val prefixes = viewModel.getLocalIpPrefixes()
            if (prefixes.isNotEmpty()) {
                url = "http://${prefixes[0]}"
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(if (server != null) "Редагувати сервер" else "Додати сервер")
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Назва сервера") },
                    placeholder = { Text("Сервер 1") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    leadingIcon = {
                        Icon(Icons.Default.Label, contentDescription = null)
                    }
                )
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("URL сервера") },
                    placeholder = { Text("http://192.168.1.100:3000") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    leadingIcon = {
                        Icon(Icons.Default.Cloud, contentDescription = null)
                    },
                    trailingIcon = {
                        if (isScanning) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                        } else if (server == null) {
                            IconButton(onClick = {
                                viewModel.scanLocalNetwork { discoveredUrl ->
                                    if (discoveredUrl != null) url = discoveredUrl
                                }
                            }) {
                                Icon(Icons.Default.Search, contentDescription = "Пошук в мережі")
                            }
                        }
                    }
                )
                if (server == null) {
                    Text(
                        "Натисніть на іконку пошуку, щоб знайти сервер автоматично",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(name, url) },
                enabled = url.isNotEmpty(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Зберегти")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Скасувати")
            }
        },
        shape = RoundedCornerShape(28.dp)
    )
}

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val apiClient: ApiClient,
    private val syncManager: SyncManager
) : ViewModel() {
    
    private val gson = Gson()
    private val serversListType = object : TypeToken<List<ServerConfig>>() {}.type
    
    private val _servers = MutableStateFlow<List<ServerConfig>>(emptyList())
    val servers: StateFlow<List<ServerConfig>> = _servers.asStateFlow()
    
    private val _activeServer = MutableStateFlow<ServerConfig?>(null)
    val activeServer: StateFlow<ServerConfig?> = _activeServer.asStateFlow()
    
    private val _serverUrl = MutableStateFlow<String>("")
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()
    
    private val _isConnected = MutableStateFlow<Boolean>(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()
    
    private val _isChecking = MutableStateFlow<Boolean>(false)
    val isChecking: StateFlow<Boolean> = _isChecking.asStateFlow()

    private val _serverStatuses = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val serverStatuses: StateFlow<Map<String, Boolean>> = _serverStatuses.asStateFlow()

    private val _isScanning = MutableStateFlow<Boolean>(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()
    
    val isOfflineMode: StateFlow<Boolean> = syncManager.isOfflineMode
    
    private val _connectionError = MutableStateFlow<String?>(null)
    val connectionError: StateFlow<String?> = _connectionError.asStateFlow()

    val isAutoStartEnabled: StateFlow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.AUTOSTART_ENABLED] ?: false
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun setAutoStartEnabled(enabled: Boolean) {
        viewModelScope.launch {
            dataStore.edit { preferences ->
                preferences[PreferencesKeys.AUTOSTART_ENABLED] = enabled
            }
        }
    }

    init {
        loadServers()
        // Periodic check in the background
        viewModelScope.launch {
            while(true) {
                if (_serverUrl.value.isNotEmpty() && !syncManager.isOfflineMode.value) {
                    checkConnection(force = false)
                }
                delay(60000) // Check every 60 seconds in background
            }
        }
    }
    
    private fun loadServers() {
        viewModelScope.launch {
            val serversJson = dataStore.data.map { preferences ->
                preferences[PreferencesKeys.SERVERS_LIST] ?: "[]"
            }.first()
            
            val serversList = try {
                gson.fromJson<List<ServerConfig>>(serversJson, serversListType) ?: emptyList()
            } catch (e: Exception) {
                android.util.Log.e("SettingsViewModel", "Error parsing servers list: ${e.message}", e)
                emptyList()
            }
            
            // Migration: if no servers but old SERVER_URL exists, migrate it
            if (serversList.isEmpty()) {
                val oldUrl = dataStore.data.map { preferences ->
                    preferences[PreferencesKeys.SERVER_URL] ?: ""
                }.first()
                
                if (oldUrl.isNotEmpty()) {
                    val migratedServer = ServerConfig(
                        name = "Сервер 1",
                        url = oldUrl,
                        isActive = true
                    )
                    val newList = listOf(migratedServer)
                    saveServersList(newList)
                    _servers.value = newList
                    _activeServer.value = migratedServer
                    _serverUrl.value = oldUrl
                } else {
                    _servers.value = emptyList()
                    _activeServer.value = null
                    _serverUrl.value = ""
                }
            } else {
                _servers.value = serversList
                
                // Load active server
                val activeId = dataStore.data.map { preferences ->
                    preferences[PreferencesKeys.ACTIVE_SERVER_ID] ?: ""
                }.first()
                
                val active = if (activeId.isNotEmpty()) {
                    serversList.find { it.id == activeId }
                } else {
                    serversList.firstOrNull { it.isActive } ?: serversList.firstOrNull()
                }
                
                _activeServer.value = active
                _serverUrl.value = active?.url ?: ""
            }
            
            if (_serverUrl.value.isNotEmpty()) {
                checkConnection()
            }
        }
    }
    
    private suspend fun saveServersList(servers: List<ServerConfig>) {
        dataStore.edit { preferences ->
            val json = gson.toJson(servers)
            preferences[PreferencesKeys.SERVERS_LIST] = json
            
            // Also update SERVER_URL for backward compatibility
            val active = servers.find { it.isActive } ?: servers.firstOrNull()
            if (active != null) {
                preferences[PreferencesKeys.SERVER_URL] = active.url
                preferences[PreferencesKeys.ACTIVE_SERVER_ID] = active.id
            } else {
                preferences.remove(PreferencesKeys.SERVER_URL)
                preferences.remove(PreferencesKeys.ACTIVE_SERVER_ID)
            }
        }
    }
    
    fun getServerUrl(): String {
        return _activeServer.value?.url ?: _serverUrl.value
    }
    
    fun addServer(name: String, url: String) {
        viewModelScope.launch {
            val normalizedUrl = normalizeUrl(url)
            val newServer = ServerConfig(
                name = name.ifEmpty { "Сервер ${_servers.value.size + 1}" },
                url = normalizedUrl,
                isActive = _servers.value.isEmpty() // First server is active by default
            )
            
            val updatedServers = _servers.value.toMutableList()
            updatedServers.add(newServer)
            
            saveServersList(updatedServers)
            _servers.value = updatedServers
            
            if (newServer.isActive || _servers.value.size == 1) {
                setActiveServer(newServer.id)
            }
        }
    }
    
    fun updateServer(serverId: String, name: String, url: String) {
        viewModelScope.launch {
            val normalizedUrl = normalizeUrl(url)
            val updatedServers = _servers.value.map { server ->
                if (server.id == serverId) {
                    server.copy(name = name, url = normalizedUrl)
                } else {
                    server
                }
            }
            
            saveServersList(updatedServers)
            _servers.value = updatedServers
            
            if (_activeServer.value?.id == serverId) {
                _activeServer.value = updatedServers.find { it.id == serverId }
                _serverUrl.value = normalizedUrl
                checkConnection()
            }
        }
    }
    
    fun deleteServer(serverId: String) {
        viewModelScope.launch {
            val updatedServers = _servers.value.filter { it.id != serverId }
            
            // If deleted server was active, activate first available
            val wasActive = _activeServer.value?.id == serverId
            val newActive = if (wasActive && updatedServers.isNotEmpty()) {
                updatedServers.first()
            } else {
                _activeServer.value
            }
            
            val finalServers = if (newActive != null && wasActive) {
                updatedServers.map { if (it.id == newActive.id) it.copy(isActive = true) else it.copy(isActive = false) }
            } else {
                updatedServers
            }
            
            saveServersList(finalServers)
            _servers.value = finalServers
            
            if (wasActive) {
                setActiveServer(newActive?.id ?: "")
            }
        }
    }
    
    fun setActiveServer(serverId: String) {
        viewModelScope.launch {
            val updatedServers = _servers.value.map { server ->
                server.copy(isActive = server.id == serverId)
            }
            
            val active = updatedServers.find { it.id == serverId }
            
            saveServersList(updatedServers)
            _servers.value = updatedServers
            _activeServer.value = active
            _serverUrl.value = active?.url ?: ""
            
            if (active != null) {
                checkConnection()
            } else {
                _isConnected.value = false
            }
        }
    }
    
    private fun normalizeUrl(url: String): String {
        var trimmed = url.trim()
        if (trimmed.isEmpty()) return ""
        
        // Remove trailing slashes
        var normalized = if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            "http://$trimmed"
        } else {
            trimmed
        }
        
        normalized = normalized.trimEnd('/')
        
        // If no port specified and not https, add :3000 as default
        val urlWithoutProtocol = normalized.substringAfter("://")
        if (!urlWithoutProtocol.contains(":") && !normalized.startsWith("https")) {
            normalized = "$normalized:3000"
        }
        
        return normalized
    }
    
    fun saveServerUrl(url: String) {
        if (_servers.value.isEmpty()) {
            addServer("Сервер 1", url)
        } else {
            _activeServer.value?.let { active ->
                updateServer(active.id, active.name, url)
            }
        }
    }
    
    fun checkConnection(force: Boolean = false) {
        if (!force && syncManager.isOfflineMode.value) {
            android.util.Log.d("SettingsViewModel", "Skipping connection check: Offline Mode is active")
            _isConnected.value = false
            return
        }
        
        if (force && syncManager.isOfflineMode.value) {
            // If manual check, temporarily disable offline mode to try reaching the server
            setOfflineMode(false)
        }
        
        val url = getServerUrl()
        val allServers = _servers.value
        
        viewModelScope.launch {
            _isChecking.value = true
            _connectionError.value = null
            try {
                // Check active server
                if (url.isNotEmpty()) {
                    val cleanUrl = normalizeUrl(url)
                    val host = cleanUrl.substringAfter("://").substringBefore(":")
                    
                    val apiService = apiClient.getApiService(cleanUrl)
                    if (apiService != null) {
                        try {
                            val response = withTimeout(10000) { apiService.healthCheck() }
                            if (response.isSuccessful && response.body() != null) {
                                _isConnected.value = true
                                _connectionError.value = null
                            } else {
                                _isConnected.value = false
                                _connectionError.value = "Сервер повернув помилку: ${response.code()}"
                            }
                        } catch (e: Exception) {
                            _isConnected.value = false
                            
                            // Diagnostic: Try pinging the host to see if it's reachable at all
                            val reachable = withContext(Dispatchers.IO) { isHostReachable(host) }
                            _connectionError.value = if (reachable) {
                                "IP доступний, але порт :3000 заблоковано Firewall на ПК"
                            } else {
                                "Пристрій $host недоступний у мережі. Перевірте WiFi."
                            }
                        }
                    } else {
                        _isConnected.value = false
                        _connectionError.value = "Додаток в автономному режимі"
                    }
                } else {
                    _isConnected.value = false
                }

                // Rapidly check other servers too
                val statuses = Collections.synchronizedMap(mutableMapOf<String, Boolean>())
                coroutineScope {
                    allServers.forEach { server ->
                        if (server.id == _activeServer.value?.id) {
                            statuses[server.id] = _isConnected.value
                        } else {
                            launch {
                                try {
                                    val serverUrl = normalizeUrl(server.url)
                                    val service = apiClient.getApiService(serverUrl)
                                    val resp = withTimeout(3000) { service?.healthCheck() }
                                    statuses[server.id] = resp?.isSuccessful == true
                                } catch (e: Exception) {
                                    statuses[server.id] = false
                                }
                            }
                        }
                    }
                }
                _serverStatuses.value = statuses.toMap()
            } catch (e: Exception) {
                _isConnected.value = false
                _connectionError.value = "Помилка: ${e.message ?: e.toString()}"
                android.util.Log.e("SettingsViewModel", "Connection check failed", e)
            } finally {
                _isChecking.value = false
            }
        }
    }
    
    private fun isHostReachable(host: String): Boolean {
        return try {
            val process = Runtime.getRuntime().exec("ping -c 1 -W 2 $host")
            val exitCode = process.waitFor()
            exitCode == 0
        } catch (e: Exception) {
            false
        }
    }

    fun setOfflineMode(enabled: Boolean) {
        viewModelScope.launch {
            syncManager.setOfflineMode(enabled)
            if (!enabled) {
                checkConnection()
            }
        }
    }

    fun getLocalIpPrefixes(): List<String> {
        val prefixes = mutableListOf<String>()
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val intf = interfaces.nextElement()
                val addrs = intf.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement()
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                        val ip = addr.hostAddress ?: ""
                        if (ip.isNotEmpty()) {
                            val parts = ip.split(".")
                            if (parts.size == 4) {
                                prefixes.add("${parts[0]}.${parts[1]}.${parts[2]}.")
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return prefixes
    }

    fun scanLocalNetwork(onDiscovered: (String?) -> Unit) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            _isScanning.value = true
            val prefixes = getLocalIpPrefixes()
            if (prefixes.isEmpty()) {
                _isScanning.value = false
                onDiscovered(null)
                return@launch
            }
            
            var discovered: String? = null
            
            coroutineScope {
                // Scan each network prefix
                prefixes.forEach { prefix ->
                    launch {
                        val potentialIps = (1..254).map { "$prefix$it" }
                        
                        // Scan IPs in this prefix in parallel
                        potentialIps.forEach { ip ->
                            launch(Dispatchers.IO) {
                                val url = "http://$ip:3000"
                                try {
                                    val apiService = apiClient.getApiService(url)
                                    val response = withTimeout(800) { apiService?.healthCheck() }
                                    if (response?.isSuccessful == true) {
                                        discovered = url
                                        // Cancel the entire coroutineScope once discovered
                                        this@coroutineScope.cancel()
                                    }
                                } catch (e: Exception) {
                                    // Ignore
                                }
                            }
                        }
                    }
                }

                // Wait for discovery or timeout
                try {
                    withTimeout(12000) {
                        while (discovered == null) {
                            delay(200)
                        }
                    }
                } catch (e: Exception) {
                    // Timeout or cancellation
                }
            }

            _isScanning.value = false
            onDiscovered(discovered)
        }
    }
}


