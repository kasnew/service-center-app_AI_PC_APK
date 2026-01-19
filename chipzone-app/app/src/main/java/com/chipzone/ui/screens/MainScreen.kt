package com.chipzone.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chipzone.ui.components.ConnectionIndicator
import com.chipzone.ui.navigation.Screen
import com.chipzone.ui.viewmodels.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    navController: NavController,
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val serverRunningState = settingsViewModel.serverRunning.collectAsState(initial = false)
    val serverInfoState = settingsViewModel.serverInfo.collectAsState(initial = null)
    val serverRunning = serverRunningState.value
    val serverInfo = serverInfoState.value
    
    // Refresh server state when screen is opened
    LaunchedEffect(Unit) {
        settingsViewModel.refreshServerState()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    ConnectionIndicator()
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Головна",
                style = MaterialTheme.typography.headlineMedium
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Server Control Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                shape = MaterialTheme.shapes.medium,
                colors = CardDefaults.cardColors(
                    containerColor = if (serverRunning) 
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    else 
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = if (serverRunning) Icons.Default.CloudDone else Icons.Default.CloudOff,
                                contentDescription = null,
                                tint = if (serverRunning) 
                                    MaterialTheme.colorScheme.primary 
                                else 
                                    MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                text = if (serverRunning) "Сервер увімкнено" else "Сервер вимкнено",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Medium
                            )
                        }
                        serverInfo?.let { info ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${info.first}:${info.second}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Switch(
                        checked = serverRunning,
                        onCheckedChange = { enabled ->
                            if (enabled) {
                                settingsViewModel.startServer()
                            } else {
                                settingsViewModel.stopServer()
                            }
                        }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Quick actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                QuickActionCard(
                    title = "Ремонти",
                    icon = Icons.Default.Build,
                    onClick = {
                        android.util.Log.d("MainScreen", "Repairs clicked")
                        navController.navigate(Screen.Repairs.route)
                    },
                    modifier = Modifier.weight(1f)
                )
                
                QuickActionCard(
                    title = "Склад",
                    icon = Icons.Default.Inventory,
                    onClick = {
                        android.util.Log.d("MainScreen", "Products clicked")
                        navController.navigate(Screen.Products.route)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                QuickActionCard(
                    title = "Транзакції",
                    icon = Icons.Default.AccountBalance,
                    onClick = {
                        android.util.Log.d("MainScreen", "Finance clicked")
                        navController.navigate(Screen.Finance.route)
                    },
                    modifier = Modifier.weight(1f)
                )
                
                QuickActionCard(
                    title = "Сканер",
                    icon = Icons.Default.QrCodeScanner,
                    onClick = {
                        android.util.Log.d("MainScreen", "Scanner clicked")
                        navController.navigate(Screen.Scanner.route)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                QuickActionCard(
                    title = "Налаштування",
                    icon = Icons.Default.Settings,
                    onClick = {
                        android.util.Log.d("MainScreen", "Settings clicked")
                        navController.navigate(Screen.Settings.route)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickActionCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(120.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}

