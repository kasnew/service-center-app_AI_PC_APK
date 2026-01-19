package com.servicecenter.ui.screens.repairs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.models.Repair
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.settings.SettingsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairDetailScreen(
    repairId: Int?,
    onBack: () -> Unit,
    onAddParts: () -> Unit,
    viewModel: RepairsViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    var repair by remember { mutableStateOf<Repair?>(null) }
    var parts by remember { mutableStateOf<List<WarehouseItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isLoadingParts by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showServerNotConnectedDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    var lockInfo by remember { mutableStateOf<com.servicecenter.data.api.LockResponse?>(null) }
    
    // Function to load repair and parts
    fun loadRepairData() {
        if (repairId != null) {
            scope.launch {
                isLoading = true
                try {
                    val loadedRepair = viewModel.getRepairById(repairId)
                    repair = loadedRepair
                    
                    // Load parts for this repair
                    isLoadingParts = true
                    try {
                        val loadedParts = viewModel.getRepairParts(repairId!!)
                        parts = loadedParts
                        android.util.Log.d("RepairDetailScreen", "Loaded ${loadedParts.size} parts for repair $repairId")
                    } catch (e: Exception) {
                        android.util.Log.e("RepairDetailScreen", "Error loading parts: ${e.message}", e)
                        parts = emptyList()
                    } finally {
                        isLoadingParts = false
                    }
                } catch (e: Exception) {
                    android.util.Log.e("RepairDetailScreen", "Error loading repair: ${e.message}", e)
                } finally {
                    isLoading = false
                }
            }
        } else {
            isLoading = false
        }
    }
    
    LaunchedEffect(repairId, isConnected) {
        if (isConnected && repairId != null) {
            scope.launch {
                val info = viewModel.getLock(repairId)
                if (info?.locked == true && info.device != "Android") {
                    lockInfo = info
                } else {
                    lockInfo = null
                }
            }
        }
        loadRepairData()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Деталі ремонту") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    ConnectionIndicator()
                    if (repair != null) {
                        IconButton(
                            onClick = { 
                                if (isConnected) {
                                    showEditDialog = true
                                } else {
                                    showServerNotConnectedDialog = true
                                }
                            },
                            enabled = isConnected
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = "Редагувати")
                        }
                        IconButton(
                            onClick = { 
                                if (isConnected) {
                                    showDeleteDialog = true
                                } else {
                                    showServerNotConnectedDialog = true
                                }
                            },
                            enabled = isConnected
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Видалити")
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { 
                    if (isConnected) {
                        onAddParts()
                    } else {
                        showServerNotConnectedDialog = true
                    }
                }
            ) {
                Text("Додати товари")
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (repair != null) {
            RepairDetailContent(
                repair = repair!!,
                parts = parts,
                isLoadingParts = isLoadingParts,
                lockInfo = lockInfo,
                onRefreshParts = {
                    loadRepairData()
                },
                viewModel = viewModel,
                modifier = Modifier.padding(padding)
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                Text("Ремонт не знайдено")
            }
        }
        
        // Delete confirmation dialog
        if (showDeleteDialog && repair != null) {
            AlertDialog(
                onDismissRequest = { showDeleteDialog = false },
                title = { Text("Видалити ремонт?") },
                text = { Text("Ви впевнені, що хочете видалити цей ремонт? Цю дію неможливо скасувати.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.deleteRepair(
                                repair = repair!!,
                                onSuccess = {
                                    showDeleteDialog = false
                                    onBack()
                                }
                            )
                        }
                    ) {
                        Text("Видалити")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteDialog = false }) {
                        Text("Скасувати")
                    }
                }
            )
        }
        
        // Edit dialog
        if (showEditDialog && repair != null) {
            EditRepairDialog(
                repair = repair!!,
                viewModel = viewModel,
                onDismiss = { showEditDialog = false },
                onSave = { updatedRepair ->
                    viewModel.updateRepair(
                        repair = updatedRepair,
                        onSuccess = {
                            repair = updatedRepair
                            showEditDialog = false
                        },
                        onError = { error ->
                            android.util.Log.e("RepairDetailScreen", "Error updating repair: $error")
                            showEditDialog = false
                        }
                    )
                }
            )
        }
        
        // Server not connected dialog
        if (showServerNotConnectedDialog) {
            AlertDialog(
                onDismissRequest = { showServerNotConnectedDialog = false },
                title = { Text("Сервер не підключено") },
                text = { 
                    Text("Для виконання цієї дії необхідно підключення до сервера на ПК. Перевірте налаштування підключення.")
                },
                confirmButton = {
                    TextButton(onClick = { showServerNotConnectedDialog = false }) {
                        Text("ОК")
                    }
                }
            )
        }
    }
}

@Composable
fun RepairDetailContent(
    repair: Repair,
    parts: List<WarehouseItem>,
    isLoadingParts: Boolean,
    lockInfo: com.servicecenter.data.api.LockResponse?,
    onRefreshParts: () -> Unit,
    viewModel: RepairsViewModel,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Lock Warning Card
        if (lockInfo?.locked == true) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.8f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                    Column {
                        Text(
                            text = "Увага! Редагується на пристрої: ${lockInfo?.device}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                        Text(
                            text = "Зміни можуть бути втрачені при одночасному збереженні.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }
        }

        // Header card with receipt ID and status
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
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
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                    Column {
                        Text(
                            text = "Квитанція №${repair.receiptId}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                AssistChip(
                    onClick = { },
                    label = { 
                        Text(
                            text = repair.status,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Medium
                        )
                    },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        labelColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        }
        
        // Client and device info
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Client info
                if (repair.clientName.isNotEmpty() || repair.clientPhone.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            if (repair.clientName.isNotEmpty()) {
                                Text(
                                    text = repair.clientName,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            if (repair.clientPhone.isNotEmpty()) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Phone,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = repair.clientPhone,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                    if (repair.deviceName.isNotEmpty() || repair.faultDesc.isNotEmpty()) {
                        Divider(
                            modifier = Modifier.padding(vertical = 8.dp),
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        )
                    }
                }
                
                // Device info
                if (repair.deviceName.isNotEmpty() || repair.faultDesc.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(24.dp)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            if (repair.deviceName.isNotEmpty()) {
                                Text(
                                    text = repair.deviceName,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            if (repair.faultDesc.isNotEmpty()) {
                                if (repair.deviceName.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                }
                                Row(
                                    verticalAlignment = Alignment.Top,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Warning,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                    Text(
                                        text = repair.faultDesc,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Work done section (separate card for better visibility)
        if (repair.workDone.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.4f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Build,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = "Виконана робота",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.tertiary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = repair.workDone,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
        
        // Status, executor and cost in one card
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Executor
                if (repair.executor.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.PersonOutline,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "Виконавець",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            text = repair.executor,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Divider(
                        modifier = Modifier.padding(vertical = 4.dp),
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                    )
                }
                
                // Cost info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Work,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "Робота",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = "${String.format("%.2f", repair.costLabor)} грн",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }
                
                Divider(
                    modifier = Modifier.padding(vertical = 8.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                )
                
                // Use totalCost from server (which is now automatically updated)
                // If server hasn't updated yet, calculate locally as fallback
                val partsTotal = parts.sumOf { it.priceUah }
                val calculatedTotal = repair.costLabor + partsTotal
                val displayTotal = if (repair.totalCost > 0 && repair.totalCost != calculatedTotal) {
                    // Use server value if it exists and differs (means server has updated)
                    repair.totalCost
                } else {
                    // Use calculated value as fallback
                    calculatedTotal
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.AttachMoney,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Загалом",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "${String.format("%.2f", displayTotal)} грн",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                if (repair.profit > 0) {
                    Divider(
                        modifier = Modifier.padding(vertical = 4.dp),
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.TrendingUp,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.tertiary
                            )
                            Text(
                                text = "Доход",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            text = "${String.format("%.2f", repair.profit)} грн",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.tertiary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
        
        // Parts/Items section
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Inventory2,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = "Товари",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (isLoadingParts) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                
                if (isLoadingParts && parts.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (parts.isEmpty()) {
                    Text(
                        text = "Товари не додані",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                } else {
                    parts.forEachIndexed { index, part ->
                        PartItem(
                            part = part,
                            repairId = repair.id!!,
                            viewModel = viewModel,
                            onDeleted = onRefreshParts,
                            showDivider = index < parts.size - 1
                        )
                    }
                    
                    // Total for parts
                    val partsTotal = parts.sumOf { it.priceUah }
                    if (partsTotal > 0) {
                        Divider(
                            modifier = Modifier.padding(vertical = 8.dp),
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.ShoppingCart,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "Всього товарів",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            Text(
                                text = "${String.format("%.2f", partsTotal)} грн",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
        
        // Note
        if (repair.note.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Note,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Примітка",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Text(
                        text = repair.note,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}

@Composable
fun PartItem(
    part: WarehouseItem,
    repairId: Int,
    viewModel: RepairsViewModel,
    onDeleted: () -> Unit,
    showDivider: Boolean
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = part.name,
                    style = MaterialTheme.typography.bodyMedium
                )
                if (part.supplier != null && part.supplier.isNotEmpty()) {
                    Text(
                        text = part.supplier,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${part.priceUah} грн",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                IconButton(
                    onClick = { showDeleteDialog = true },
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Видалити",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
    
    // Delete confirmation dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Видалити товар?") },
            text = { Text("Ви впевнені, що хочете видалити \"${part.name}\" з квитанції?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            val success = viewModel.removePartFromRepair(repairId, part.id)
                            if (success) {
                                showDeleteDialog = false
                                onDeleted()
                            }
                        }
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
    
    if (showDivider) {
        Divider(modifier = Modifier.padding(vertical = 4.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditRepairDialog(
    repair: Repair,
    viewModel: RepairsViewModel,
    onDismiss: () -> Unit,
    onSave: (Repair) -> Unit
) {
    var clientName by remember { mutableStateOf(repair.clientName) }
    var clientPhone by remember { mutableStateOf(repair.clientPhone) }
    var deviceName by remember { mutableStateOf(repair.deviceName) }
    var faultDesc by remember { mutableStateOf(repair.faultDesc) }
    var workDone by remember { mutableStateOf(repair.workDone) }
    var costLabor by remember { mutableStateOf(repair.costLabor.toString()) }
    var status by remember { mutableStateOf(repair.status) }
    var executor by remember { mutableStateOf(repair.executor) }
    var note by remember { mutableStateOf(repair.note) }
    var showStatusDropdown by remember { mutableStateOf(false) }
    var lockInfo by remember { mutableStateOf<com.servicecenter.data.api.LockResponse?>(null) }
    
    // Manage Lock
    LaunchedEffect(repair.id) {
        if (repair.id != null) {
            val info = viewModel.getLock(repair.id)
            if (info?.locked == true && info.device != "Android") {
                lockInfo = info
            }
            viewModel.setLock(repair.id, "Android")
        }
    }
    
    // Release Lock on Dispose
    DisposableEffect(repair.id) {
        onDispose {
            if (repair.id != null) {
                viewModel.releaseLock(repair.id)
            }
        }
    }
    
    val statusList = listOf(
        "У черзі",
        "У роботі",
        "Очікув. відпов./деталі",
        "Готовий до видачі",
        "Не додзвонилися",
        "Видано",
        "Одеса"
    )
    
    // Format phone number with dashes
    fun formatPhoneNumber(phone: String): String {
        try {
            val digits = phone.filter { it.isDigit() }
            if (digits.isEmpty()) return phone
            
            return when {
                digits.length <= 3 -> digits
                digits.length <= 6 -> {
                    val part1 = digits.substring(0, minOf(3, digits.length))
                    val part2 = if (digits.length > 3) digits.substring(3) else ""
                    "$part1-$part2"
                }
                digits.length <= 8 -> {
                    val part1 = digits.substring(0, minOf(3, digits.length))
                    val part2 = if (digits.length > 3) digits.substring(3, minOf(6, digits.length)) else ""
                    val part3 = if (digits.length > 6) digits.substring(6) else ""
                    "$part1-$part2-$part3"
                }
                else -> {
                    val part1 = digits.substring(0, minOf(3, digits.length))
                    val part2 = if (digits.length > 3) digits.substring(3, minOf(6, digits.length)) else ""
                    val part3 = if (digits.length > 6) digits.substring(6, minOf(8, digits.length)) else ""
                    val part4 = if (digits.length > 8) digits.substring(8, minOf(10, digits.length)) else ""
                    "$part1-$part2-$part3-$part4"
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("EditRepairDialog", "Error formatting phone: ${e.message}", e)
            // Return original phone if formatting fails
            return phone
        }
    }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { 
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text("Редагувати ремонт")
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Lock warning inside dialog
                if (lockInfo?.locked == true) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.8f)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "⚠️ Увага! Ця квитанція вже редагується на пристрої: ${lockInfo?.device}",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }

                // Client Information Section
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                "Інформація про клієнта",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        OutlinedTextField(
                            value = clientName,
                            onValueChange = { clientName = it },
                            label = { Text("Ім'я клієнта") },
                            leadingIcon = {
                                Icon(Icons.Default.Person, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                        OutlinedTextField(
                            value = clientPhone,
                            onValueChange = { 
                                // Limit input to 15 characters (digits + dashes)
                                if (it.length <= 15) {
                                    clientPhone = formatPhoneNumber(it)
                                }
                            },
                            label = { Text("Телефон") },
                            leadingIcon = {
                                Icon(Icons.Default.Phone, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                    }
                }
                
                // Device Information Section
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.PhoneAndroid,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                "Інформація про техніку",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.secondary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        OutlinedTextField(
                            value = deviceName,
                            onValueChange = { deviceName = it },
                            label = { Text("Назва техніки") },
                            leadingIcon = {
                                Icon(Icons.Default.PhoneAndroid, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.secondary,
                                focusedLabelColor = MaterialTheme.colorScheme.secondary
                            )
                        )
                        OutlinedTextField(
                            value = faultDesc,
                            onValueChange = { faultDesc = it },
                            label = { Text("Опис несправності") },
                            leadingIcon = {
                                Icon(Icons.Default.Warning, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 3,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.secondary,
                                focusedLabelColor = MaterialTheme.colorScheme.secondary
                            )
                        )
                    }
                }
                
                // Work Information Section
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Build,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.tertiary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                "Виконана робота",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.tertiary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        OutlinedTextField(
                            value = workDone,
                            onValueChange = { workDone = it },
                            label = { Text("Опис виконаної роботи") },
                            leadingIcon = {
                                Icon(Icons.Default.Build, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 5,
                            placeholder = { Text("Опишіть виконану роботу...") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.tertiary,
                                focusedLabelColor = MaterialTheme.colorScheme.tertiary
                            )
                        )
                        OutlinedTextField(
                            value = costLabor,
                            onValueChange = { costLabor = it },
                            label = { Text("Вартість роботи (грн)") },
                            leadingIcon = {
                                Icon(Icons.Default.AttachMoney, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.tertiary,
                                focusedLabelColor = MaterialTheme.colorScheme.tertiary
                            )
                        )
                    }
                }
                // Status and Additional Information Section
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Info,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                "Додаткова інформація",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        
                        // Status dropdown
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = status,
                                onValueChange = { },
                                label = { Text("Статус") },
                                leadingIcon = {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                                },
                                modifier = Modifier.fillMaxWidth(),
                                readOnly = true,
                                trailingIcon = {
                                    IconButton(onClick = { showStatusDropdown = true }) {
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = "Виберіть статус")
                                    }
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                                    focusedLabelColor = MaterialTheme.colorScheme.primary
                                )
                            )
                            
                            DropdownMenu(
                                expanded = showStatusDropdown,
                                onDismissRequest = { showStatusDropdown = false }
                            ) {
                                statusList.forEach { statusOption ->
                                    DropdownMenuItem(
                                        text = { Text(statusOption) },
                                        onClick = {
                                            status = statusOption
                                            showStatusDropdown = false
                                        },
                                        leadingIcon = {
                                            Icon(
                                                Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = if (status == statusOption) 
                                                    MaterialTheme.colorScheme.primary 
                                                else 
                                                    androidx.compose.ui.graphics.Color.Transparent
                                            )
                                        }
                                    )
                                }
                            }
                        }
                        
                        OutlinedTextField(
                            value = executor,
                            onValueChange = { executor = it },
                            label = { Text("Виконавець") },
                            leadingIcon = {
                                Icon(Icons.Default.PersonOutline, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                        
                        OutlinedTextField(
                            value = note,
                            onValueChange = { note = it },
                            label = { Text("Примітка") },
                            leadingIcon = {
                                Icon(Icons.Default.Note, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 3,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                focusedLabelColor = MaterialTheme.colorScheme.primary
                            )
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updatedRepair = repair.copy(
                        clientName = clientName,
                        clientPhone = clientPhone,
                        deviceName = deviceName,
                        faultDesc = faultDesc,
                        workDone = workDone,
                        costLabor = costLabor.toDoubleOrNull() ?: 0.0,
                        totalCost = costLabor.toDoubleOrNull() ?: 0.0,
                        status = status,
                        executor = executor,
                        note = note
                    )
                    onSave(updatedRepair)
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Icon(
                    Icons.Default.Save,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("Зберегти")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Icon(
                    Icons.Default.Cancel,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("Скасувати")
            }
        }
    )
}

