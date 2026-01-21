package com.servicecenter.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.settings.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onRepairsClick: () -> Unit,
    onWarehouseClick: () -> Unit,
    onTransactionsClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onScannerClick: () -> Unit,
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    val isChecking by settingsViewModel.isChecking.collectAsState(initial = false)

    // Ensure connection check is triggered when screen appears
    LaunchedEffect(Unit) {
        settingsViewModel.checkConnection()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFE3F2FD), // Light blue top
                        Color(0xFFF5F5F5)  // Light grey/white bottom
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
        ) {
            Spacer(modifier = Modifier.height(70.dp))
            
            // Header with Connection Status (Diia style)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "ChipZone",
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 34.sp,
                            color = Color(0xFF1A1A1A),
                            letterSpacing = (-0.5).sp
                        )
                    )
                    Text(
                        text = "Сервіс",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Medium,
                            fontSize = 24.sp,
                            color = Color(0xFF1A1A1A).copy(alpha = 0.6f)
                        ),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                // Visible Connection Status Pill
                Surface(
                    color = when {
                        isChecking -> Color(0xFFF5F5F5)
                        isConnected -> Color(0xFFE8F5E9)
                        else -> Color(0xFFFFEBEE)
                    },
                    shape = CircleShape,
                    modifier = Modifier.padding(top = 4.dp),
                    shadowElevation = 1.dp
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (isChecking) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(12.dp),
                                strokeWidth = 2.dp,
                                color = Color.Gray
                            )
                            Text(
                                text = "Перевірка...",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = Color.Gray,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .background(
                                        color = if (isConnected) Color(0xFF4CAF50) else Color(0xFFF44336),
                                        shape = CircleShape
                                    )
                            )
                            Text(
                                text = if (isConnected) "В мережі" else "Офлайн",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    color = if (isConnected) Color(0xFF2E7D32) else Color(0xFFC62828),
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }
            }
            
            Text(
                text = "Сервіс",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 24.sp,
                    color = Color(0xFF1A1A1A).copy(alpha = 0.7f)
                ),
                modifier = Modifier.padding(top = 2.dp)
            )
            
            Spacer(modifier = Modifier.height(30.dp))
            
            // Grid of Actions
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    QuickActionCard(
                        title = "Ремонти",
                        icon = Icons.Default.Build,
                        onClick = onRepairsClick,
                        modifier = Modifier.weight(1f),
                        iconBgColor = Color(0xFFE3F2FD),
                        iconTint = Color(0xFF1976D2)
                    )
                    
                    QuickActionCard(
                        title = "Склад",
                        icon = Icons.Default.Inventory,
                        onClick = onWarehouseClick,
                        modifier = Modifier.weight(1f),
                        iconBgColor = Color(0xFFF1F8E9),
                        iconTint = Color(0xFF388E3C)
                    )
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    QuickActionCard(
                        title = "Транзакції",
                        icon = Icons.Default.AccountBalance,
                        onClick = onTransactionsClick,
                        modifier = Modifier.weight(1f),
                        iconBgColor = Color(0xFFFFF3E0),
                        iconTint = Color(0xFFF57C00)
                    )
                    
                    QuickActionCard(
                        title = "Сканер",
                        icon = Icons.Default.QrCodeScanner,
                        onClick = onScannerClick,
                        modifier = Modifier.weight(1f),
                        iconBgColor = Color(0xFFF3E5F5),
                        iconTint = Color(0xFF7B1FA2)
                    )
                }
                
                QuickActionCard(
                    title = "Налаштування",
                    icon = Icons.Default.Settings,
                    onClick = onSettingsClick,
                    modifier = Modifier.fillMaxWidth(),
                    iconBgColor = Color(0xFFECEFF1),
                    iconTint = Color(0xFF455A64)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickActionCard(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    iconBgColor: Color = Color.Transparent,
    iconTint: Color = Color.Black
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(110.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(
                color = iconBgColor,
                shape = CircleShape,
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = title,
                        modifier = Modifier.size(24.dp),
                        tint = iconTint
                    )
                }
            }
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            )
        }
    }
}


