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
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
fun RepairDetailScreen(
    repairId: Int?,
    onBack: () -> Unit,
    onAddParts: () -> Unit,
    viewModel: RepairsViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val scope = rememberCoroutineScope()
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    var lockInfo by remember { mutableStateOf<com.servicecenter.data.api.LockResponse?>(null) }
    
    // Core state
    var repair by remember { mutableStateOf<Repair?>(null) }
    var parts by remember { mutableStateOf<List<WarehouseItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isLoadingParts by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showServerNotConnectedDialog by remember { mutableStateOf(false) }

    // Editable state
    var clientName by remember { mutableStateOf("") }
    var clientPhone by remember { mutableStateOf("") }
    var deviceName by remember { mutableStateOf("") }
    var faultDesc by remember { mutableStateOf("") }
    var workDone by remember { mutableStateOf("") }
    var costLabor by remember { mutableStateOf("0.0") }
    var status by remember { mutableStateOf("У черзі") }
    var executor by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var isPaid by remember { mutableStateOf(false) }
    var paymentType by remember { mutableStateOf("Готівка") }
    var isSaving by remember { mutableStateOf(false) }
    var executors by remember { mutableStateOf<List<com.servicecenter.data.api.Executor>>(emptyList()) }
    
    // Function to load repair and parts
    fun loadRepairData() {
        if (repairId != null) {
            scope.launch {
                isLoading = true
                try {
                    val loadedRepair = viewModel.getRepairById(repairId)
                    repair = loadedRepair
                    if (loadedRepair != null) {
                        clientName = loadedRepair.clientName
                        clientPhone = loadedRepair.clientPhone
                        deviceName = loadedRepair.deviceName
                        faultDesc = loadedRepair.faultDesc
                        workDone = loadedRepair.workDone
                        costLabor = loadedRepair.costLabor.toString()
                        status = loadedRepair.status
                        executor = loadedRepair.executor
                        note = loadedRepair.note
                        isPaid = loadedRepair.isPaid
                        paymentType = loadedRepair.paymentType
                    }
                    
                    // Load parts for this repair
                    isLoadingParts = true
                    try {
                        val loadedParts = viewModel.getRepairParts(repairId!!)
                        parts = loadedParts
                    } catch (e: Exception) {
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

            // Fetch executors
            scope.launch {
                try {
                    val loadedExecutors = viewModel.getExecutors()
                    executors = loadedExecutors
                } catch (e: Exception) {
                    android.util.Log.e("RepairDetailScreen", "Error loading executors: ${e.message}")
                }
            }
        } else {
            isLoading = false
        }
    }
    
    // Lock logic moved to screen level
    LaunchedEffect(repairId, isConnected) {
        settingsViewModel.checkConnection()
        if (isConnected && repairId != null) {
            val info = viewModel.getLock(repairId)
            if (info?.locked == true && info.device != "Android") {
                lockInfo = info
            } else {
                lockInfo = null
                viewModel.setLock(repairId, "Android")
            }
        }
        loadRepairData()
    }

    // Release Lock on Dispose
    DisposableEffect(repairId) {
        onDispose {
            if (repairId != null) {
                viewModel.releaseLock(repairId)
            }
        }
    }
    
    Scaffold(
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        androidx.compose.ui.graphics.Brush.verticalGradient(
                            colors = listOf(androidx.compose.ui.graphics.Color(0xFFE3F2FD), androidx.compose.ui.graphics.Color(0xFFF5F5F5))
                        )
                    )
            ) {
                Column {
                    Spacer(modifier = Modifier.height(32.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            IconButton(onClick = onBack) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                            }
                            Text(
                                text = "Деталі",
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ConnectionIndicator()
                            if (repair != null) {
                                IconButton(
                                    onClick = { 
                                        if (isConnected) {
                                            isSaving = true
                                            val updatedRepair = repair!!.copy(
                                                clientName = clientName,
                                                clientPhone = clientPhone,
                                                deviceName = deviceName,
                                                faultDesc = faultDesc,
                                                workDone = workDone,
                                                costLabor = costLabor.toDoubleOrNull() ?: 0.0,
                                                status = status,
                                                executor = executor,
                                                note = note,
                                                isPaid = isPaid,
                                                paymentType = paymentType
                                            )
                                            viewModel.updateRepair(
                                                repair = updatedRepair,
                                                onSuccess = {
                                                    repair = updatedRepair
                                                    isSaving = false
                                                },
                                                onError = { isSaving = false }
                                            )
                                        } else {
                                            showServerNotConnectedDialog = true
                                        }
                                    },
                                    enabled = isConnected && !isSaving
                                ) {
                                    if (isSaving) {
                                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                    } else {
                                        Icon(Icons.Default.Save, contentDescription = "Зберегти")
                                    }
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
                    }
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { 
                    if (isConnected) {
                        onAddParts()
                    } else {
                        showServerNotConnectedDialog = true
                    }
                },
                modifier = Modifier
                    .padding(16.dp),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
                containerColor = androidx.compose.ui.graphics.Color(0xFF1976D2)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White)
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    androidx.compose.ui.graphics.Brush.verticalGradient(
                        colors = listOf(androidx.compose.ui.graphics.Color(0xFFE3F2FD), androidx.compose.ui.graphics.Color(0xFFF5F5F5))
                    )
                )
                .padding(padding)
        ) {
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (repair != null) {
                RepairDetailEditableContent(
                    repair = repair!!,
                    parts = parts,
                    isLoadingParts = isLoadingParts,
                    lockInfo = lockInfo,
                    onRefreshParts = { loadRepairData() },
                    
                    // Form state
                    clientName = clientName, onClientNameChange = { clientName = it },
                    clientPhone = clientPhone, onClientPhoneChange = { clientPhone = it },
                    deviceName = deviceName, onDeviceNameChange = { deviceName = it },
                    faultDesc = faultDesc, onFaultDescChange = { faultDesc = it },
                    workDone = workDone, onWorkDoneChange = { workDone = it },
                    costLabor = costLabor, onCostLaborChange = { costLabor = it },
                    status = status, onStatusChange = { status = it },
                    executor = executor, onExecutorChange = { executor = it },
                    note = note, onNoteChange = { note = it },
                    isPaid = isPaid, onIsPaidChange = { isPaid = it },
                    paymentType = paymentType, onPaymentTypeChange = { paymentType = it },
                    executors = executors,
                    
                    viewModel = viewModel,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Text("Ремонт не знайдено")
                }
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
                        Text("Видалити", color = Color.Red)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteDialog = false }) {
                        Text("Скасувати")
                    }
                },
                shape = RoundedCornerShape(28.dp)
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
                },
                shape = RoundedCornerShape(28.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairDetailEditableContent(
    repair: Repair,
    parts: List<WarehouseItem>,
    isLoadingParts: Boolean,
    lockInfo: com.servicecenter.data.api.LockResponse?,
    onRefreshParts: () -> Unit,
    
    // Form state from parent
    clientName: String, onClientNameChange: (String) -> Unit,
    clientPhone: String, onClientPhoneChange: (String) -> Unit,
    deviceName: String, onDeviceNameChange: (String) -> Unit,
    faultDesc: String, onFaultDescChange: (String) -> Unit,
    workDone: String, onWorkDoneChange: (String) -> Unit,
    costLabor: String, onCostLaborChange: (String) -> Unit,
    status: String, onStatusChange: (String) -> Unit,
    executor: String, onExecutorChange: (String) -> Unit,
    note: String, onNoteChange: (String) -> Unit,
    isPaid: Boolean, onIsPaidChange: (Boolean) -> Unit,
    paymentType: String, onPaymentTypeChange: (String) -> Unit,
    executors: List<com.servicecenter.data.api.Executor>,
    
    viewModel: RepairsViewModel,
    modifier: Modifier = Modifier
) {
    var showStatusDropdown by remember { mutableStateOf(false) }
    var showPaymentTypeDropdown by remember { mutableStateOf(false) }
    var showExecutorDropdown by remember { mutableStateOf(false) }
    
    val statusList = listOf(
        "У черзі", "У роботі", "Очікув. відпов./деталі",
        "Готовий до видачі", "Не додзвонилися", "Видано", "Одеса"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Lock Warning Card (same as before)
        if (lockInfo?.locked == true) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.8f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                    Text("Увага! Редагується на пристрої: ${lockInfo.device}", fontWeight = FontWeight.Bold)
                }
            }
        }

        // 1. Header with Receipt ID and Status
        Card(
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Квитанція №${repair.receiptId}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                
                Box {
                    AssistChip(
                        onClick = { showStatusDropdown = true },
                        label = { Text(status) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = getAndroidStatusColor(status),
                            labelColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                    DropdownMenu(expanded = showStatusDropdown, onDismissRequest = { showStatusDropdown = false }) {
                        statusList.forEach { s ->
                            DropdownMenuItem(text = { Text(s) }, onClick = { onStatusChange(s); showStatusDropdown = false })
                        }
                    }
                }
            }
        }

        // 2. Client Info
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Клієнт", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                OutlinedTextField(value = clientName, onValueChange = onClientNameChange, label = { Text("Ім'я") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
                OutlinedTextField(value = clientPhone, onValueChange = onClientPhoneChange, label = { Text("Телефон") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
            }
        }

        // 3. Device Info
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Техніка", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
                OutlinedTextField(value = deviceName, onValueChange = onDeviceNameChange, label = { Text("Модель") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
                OutlinedTextField(value = faultDesc, onValueChange = onFaultDescChange, label = { Text("Несправність") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
            }
        }

        // 4. Work Info
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Роботи", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.tertiary)
                OutlinedTextField(value = workDone, onValueChange = onWorkDoneChange, label = { Text("Виконана робота") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
                OutlinedTextField(value = costLabor, onValueChange = onCostLaborChange, label = { Text("Вартість роботи (грн)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
            }
        }

        // 5. Payment & Notes
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Оплата та Нотатки", style = MaterialTheme.typography.labelLarge)
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isPaid, onCheckedChange = onIsPaidChange)
                    Text("Оплачено")
                    
                    if (isPaid) {
                        Spacer(modifier = Modifier.width(16.dp))
                        Box {
                            TextButton(onClick = { showPaymentTypeDropdown = true }) {
                                Text(paymentType)
                                Icon(Icons.Default.ArrowDropDown, null)
                            }
                            DropdownMenu(expanded = showPaymentTypeDropdown, onDismissRequest = { showPaymentTypeDropdown = false }) {
                                listOf("Готівка", "Картка").forEach { t ->
                                    DropdownMenuItem(
                                        text = { Text(t) }, 
                                        onClick = { 
                                            onPaymentTypeChange(t)
                                            showPaymentTypeDropdown = false 
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                // Executor selection
                Box(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = executor,
                        onValueChange = { },
                        label = { Text("Виконавець") },
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true,
                        shape = RoundedCornerShape(16.dp),
                        trailingIcon = {
                            IconButton(onClick = { showExecutorDropdown = true }) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = "Виберіть виконавця")
                            }
                        }
                    )
                    DropdownMenu(
                        expanded = showExecutorDropdown,
                        onDismissRequest = { showExecutorDropdown = false }
                    ) {
                        executors
                            .filter { it.salaryPercent != 0.0 }
                            .forEach { exec ->
                                DropdownMenuItem(
                                    text = { Text(exec.name) },
                                    onClick = {
                                        onExecutorChange(exec.name)
                                        showExecutorDropdown = false
                                    }
                                )
                            }
                        if (executors.isEmpty()) {
                            DropdownMenuItem(text = { Text("Андрій") }, onClick = { onExecutorChange("Андрій"); showExecutorDropdown = false })
                        }
                    }
                }
 
                OutlinedTextField(value = note, onValueChange = onNoteChange, label = { Text("Примітки") }, modifier = Modifier.fillMaxWidth(), maxLines = 3, shape = RoundedCornerShape(16.dp))
            }
        }

        // 6. Financial Summary (Profit)
        Card(
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Всього:")
                    Text("${repair.totalCost} грн", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
                }
                if (repair.profit > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Дохід:", color = Color(0xFF2E7D32))
                        Text("${repair.profit} грн", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                    }
                }
            }
        }

        // 7. Parts Section (existing)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Деталі та Товари", style = MaterialTheme.typography.labelLarge)
                if (parts.isEmpty()) {
                    Text("Деталі не додані", style = MaterialTheme.typography.bodySmall)
                } else {
                    parts.forEach { part ->
                         PartItem(part = part, repairId = repair.id!!, viewModel = viewModel, onDeleted = onRefreshParts, showDivider = true)
                    }
                }
            }
        }
    }
}

// Function to get status color matching PC app colors
fun getAndroidStatusColor(status: String): Color {
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
