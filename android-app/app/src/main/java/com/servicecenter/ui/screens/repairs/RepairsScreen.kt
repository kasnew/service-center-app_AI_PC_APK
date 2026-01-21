package com.servicecenter.ui.screens.repairs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.models.Repair
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.settings.SettingsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairsScreen(
    onRepairClick: (Int?) -> Unit,
    onCreateRepair: () -> Unit,
    viewModel: RepairsViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val repairs by viewModel.repairs.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedStatus by viewModel.selectedStatus.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val availableStatuses = viewModel.availableStatuses
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFE3F2FD),
                        Color(0xFFF5F5F5)
                    )
                )
            )
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Diia-style Header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(top = 50.dp, bottom = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Ремонти",
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 28.sp,
                            color = Color(0xFF1A1A1A)
                        )
                    )
                    
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        // Connection Status Pill
                        Surface(
                            color = if (isConnected) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                            shape = CircleShape
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(5.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(
                                            color = if (isConnected) Color(0xFF4CAF50) else Color(0xFFF44336),
                                            shape = CircleShape
                                        )
                                )
                                Text(
                                    text = if (isConnected) "В мережі" else "Офлайн",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = if (isConnected) Color(0xFF2E7D32) else Color(0xFFC62828),
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                            }
                        }
                        
                        // Sync button
                        IconButton(
                            onClick = { if (isConnected) viewModel.loadRepairs() },
                            enabled = !isLoading && isConnected
                        ) {
                            Icon(Icons.Default.Sync, contentDescription = "Синхронізувати", tint = Color(0xFF1976D2))
                        }
                    }
                }
            }
            
            // Floating Action Button overlay
            Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
        ) {
            // Filters row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Search bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = viewModel::search,
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Пошук...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    trailingIcon = if (searchQuery.isNotEmpty()) {
                        {
                            IconButton(onClick = { viewModel.search("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Очистити")
                            }
                        }
                    } else null,
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White,
                        disabledContainerColor = Color.White,
                    )
                )
                
                // Status filter dropdown
                StatusFilterDropdown(
                    selectedStatus = selectedStatus,
                    availableStatuses = availableStatuses,
                    onStatusSelected = { status ->
                        viewModel.setStatusFilter(status)
                    },
                    onClearFilter = {
                        viewModel.clearStatusFilter()
                    }
                )
            }
            
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(repairs) { repair ->
                        RepairItem(
                            repair = repair,
                            viewModel = viewModel,
                            onClick = { onRepairClick(repair.id) }
                        )
                    }
                    
                    if (repairs.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(top = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = when {
                                        searchQuery.isNotEmpty() || selectedStatus != null -> "Нічого не знайдено"
                                        else -> "Немає ремонтів"
                                    },
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
            }
        }
            
        // FAB in the corner (outside the Column but inside the Box overlay)
            FloatingActionButton(
                onClick = { if (isConnected) onCreateRepair() },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(24.dp),
                shape = RoundedCornerShape(24.dp),
                containerColor = Color(0xFF1976D2),
                elevation = FloatingActionButtonDefaults.elevation(8.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Додати ремонт", tint = Color.White)
            }
        }
    }
}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairItem(
    repair: Repair,
    viewModel: RepairsViewModel,
    onClick: () -> Unit
) {
    var parts by remember { mutableStateOf<List<WarehouseItem>>(emptyList()) }
    var isLoadingParts by remember { mutableStateOf(false) }
    
    // Load parts when repair is displayed
    LaunchedEffect(repair.id) {
        if (repair.id != null) {
            isLoadingParts = true
            try {
                parts = viewModel.getRepairParts(repair.id)
            } catch (e: Exception) {
                parts = emptyList()
            } finally {
                isLoadingParts = false
            }
        }
    }
    
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // First row: Receipt ID and Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "№${repair.receiptId}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                    )
                }
                AssistChip(
                    onClick = { },
                    label = { 
                        Text(
                            text = repair.status,
                            style = MaterialTheme.typography.labelSmall
                        )
                    },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = getStatusColor(repair.status),
                        labelColor = Color.White
                    )
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Second row: Client name and phone
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        if (repair.clientName.isNotEmpty()) {
                            Text(
                                text = repair.clientName,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (repair.clientPhone.isNotEmpty()) {
                            Text(
                                text = repair.clientPhone,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Text(
                        text = "${String.format("%.2f", repair.totalCost)} грн",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            
            // Third row: Device name
            if (repair.deviceName.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.PhoneAndroid,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = repair.deviceName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            // Fourth row: Executor
            if (repair.executor.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.PersonOutline,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = repair.executor,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            // Parts section
            if (isLoadingParts) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Start,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Завантаження товарів...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else if (parts.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Divider(
                    modifier = Modifier.padding(vertical = 4.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Inventory2,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Товари:",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                    )
                }
                
                Spacer(modifier = Modifier.height(6.dp))
                
                // Show parts (limit to 3 for compact display)
                val displayParts = if (parts.size > 3) parts.take(3) else parts
                displayParts.forEachIndexed { index, part ->
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "• ${part.name}",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "${String.format("%.2f", part.priceUah)} грн",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Medium
                            )
                        }
                    }
                }
                
                if (parts.size > 3) {
                    Text(
                        text = "... та ще ${parts.size - 3} товарів",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        modifier = Modifier.padding(top = 4.dp, start = 24.dp)
                    )
                }
                
                // Total for parts
                val partsTotal = parts.sumOf { it.priceUah }
                if (partsTotal > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Всього товарів:",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                            Text(
                                text = "${String.format("%.2f", partsTotal)} грн",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusFilterDropdown(
    selectedStatus: String?,
    availableStatuses: List<String>,
    onStatusSelected: (String?) -> Unit,
    onClearFilter: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = selectedStatus ?: "Всі стани",
            onValueChange = { },
            readOnly = true,
            trailingIcon = {
                if (selectedStatus != null) {
                    IconButton(
                        onClick = {
                            onClearFilter()
                            expanded = false
                        }
                    ) {
                        Icon(Icons.Default.Clear, contentDescription = "Очистити фільтр")
                    }
                } else {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                }
            },
            leadingIcon = {
                Icon(
                    Icons.Default.FilterList,
                    contentDescription = "Фільтр по станам",
                    tint = if (selectedStatus != null) 
                        MaterialTheme.colorScheme.primary 
                    else 
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            modifier = Modifier
                .menuAnchor()
                .width(180.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                disabledContainerColor = Color.White
            ),
            singleLine = true,
            shape = RoundedCornerShape(16.dp)
        )
        
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            // Option: All statuses
            DropdownMenuItem(
                text = { Text("Всі стани") },
                onClick = {
                    onClearFilter()
                    expanded = false
                },
                leadingIcon = {
                    Icon(
                        Icons.Default.ClearAll,
                        contentDescription = null,
                        tint = if (selectedStatus == null) 
                            MaterialTheme.colorScheme.primary 
                        else 
                            MaterialTheme.colorScheme.onSurface
                    )
                }
            )
            
            Divider()
            
            // Status options
            availableStatuses.forEach { status ->
                DropdownMenuItem(
                    text = { Text(status) },
                    onClick = {
                        onStatusSelected(status)
                        expanded = false
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = if (selectedStatus == status) 
                                MaterialTheme.colorScheme.primary 
                            else 
                                androidx.compose.ui.graphics.Color.Transparent
                        )
                    }
                )
            }
        }
    }
}

// Helper function to get status color matching PC app colors
fun getStatusColor(status: String): Color {
    return when (status) {
        "У черзі" -> Color(0xFFF59E0B) // amber-500
        "У роботі" -> Color(0xFF3B82F6) // blue-500
        "Очікув. відпов./деталі" -> Color(0xFFF97316) // orange-500
        "Готовий до видачі" -> Color(0xFF22C55E) // green-500
        "Не додзвонилися" -> Color(0xFFEF4444) // red-500
        "Одеса" -> Color(0xFFA855F7) // purple-500
        "Видано" -> Color(0xFF14B8A6) // teal-500
        else -> Color(0xFF64748B) // slate-500
    }
}
