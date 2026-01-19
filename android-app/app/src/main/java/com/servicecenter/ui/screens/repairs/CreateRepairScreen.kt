package com.servicecenter.ui.screens.repairs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.api.Executor
import com.servicecenter.data.models.Repair
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.settings.SettingsViewModel
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateRepairScreen(
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: RepairsViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    var receiptId by remember { mutableStateOf("") }
    var clientName by remember { mutableStateOf("") }
    var clientPhone by remember { mutableStateOf(TextFieldValue("")) }
    var deviceName by remember { mutableStateOf("") }
    var faultDesc by remember { mutableStateOf("") }
    var costLabor by remember { mutableStateOf("") }
    var executor by remember { mutableStateOf("Андрій") }
    var status by remember { mutableStateOf("У черзі") }
    var isLoadingReceiptId by remember { mutableStateOf(false) }
    var executors by remember { mutableStateOf<List<Executor>>(emptyList()) }
    var showExecutorDropdown by remember { mutableStateOf(false) }
    var showStatusDropdown by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var isCreatingRepair by remember { mutableStateOf(false) }
    var showServerNotConnectedDialog by remember { mutableStateOf(false) }
    
    val isLoading by viewModel.isLoading.collectAsState()
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    
    val statusList = listOf(
        "У черзі",
        "У роботі",
        "Очікув. відпов./деталі",
        "Готовий до видачі",
        "Не додзвонилися",
        "Видано",
        "Одеса"
    )
    
    // Format phone number with dashes while preserving cursor position
    fun formatPhoneNumber(value: TextFieldValue): TextFieldValue {
        try {
            val text = value.text
            val cursorPosition = value.selection.start
            
            // Get digits only
            val digits = text.filter { it.isDigit() }
            if (digits.isEmpty()) {
                return TextFieldValue("", TextRange(0))
            }
            
            // Format with dashes
            val formatted = when {
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
            
            // Calculate new cursor position
            // Count digits before cursor in original text
            val digitsBeforeCursor = text.substring(0, cursorPosition).filter { it.isDigit() }.length
            // Find position in formatted string
            var newCursorPos = 0
            var digitCount = 0
            for (i in formatted.indices) {
                if (formatted[i].isDigit()) {
                    digitCount++
                    if (digitCount > digitsBeforeCursor) {
                        newCursorPos = i
                        break
                    }
                }
                newCursorPos = i + 1
            }
            
            return TextFieldValue(
                text = formatted,
                selection = TextRange(newCursorPos.coerceIn(0, formatted.length))
            )
        } catch (e: Exception) {
            android.util.Log.e("CreateRepairScreen", "Error formatting phone: ${e.message}", e)
            return value
        }
    }
    
    // Load next receipt ID and executors when screen opens
    // This will run every time the screen is composed (opened)
    LaunchedEffect(Unit) {
        isLoadingReceiptId = true
        try {
            val nextId = viewModel.getNextReceiptId()
            if (nextId != null) {
                receiptId = nextId.toString()
                android.util.Log.d("CreateRepairScreen", "Loaded next receipt ID: $nextId")
            } else {
                android.util.Log.w("CreateRepairScreen", "Failed to load next receipt ID")
            }
            
            val executorsList = viewModel.getExecutors()
            executors = executorsList
            if (executorsList.isNotEmpty()) {
                executor = executorsList.first().name
                android.util.Log.d("CreateRepairScreen", "Loaded ${executorsList.size} executors")
            } else {
                android.util.Log.w("CreateRepairScreen", "No executors loaded, using default")
            }
        } catch (e: Exception) {
            android.util.Log.e("CreateRepairScreen", "Error loading data: ${e.message}", e)
        } finally {
            isLoadingReceiptId = false
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Новий ремонт") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    ConnectionIndicator()
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = receiptId,
                onValueChange = { receiptId = it },
                label = { Text("Номер квитанції") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoadingReceiptId,
                placeholder = { Text(if (isLoadingReceiptId) "Завантаження..." else "") }
            )
            
            OutlinedTextField(
                value = clientName,
                onValueChange = { clientName = it },
                label = { Text("Ім'я клієнта") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = clientPhone,
                onValueChange = { 
                    // Limit input to 15 characters (digits + dashes)
                    val newValue = if (it.text.length <= 15) it else {
                        TextFieldValue(it.text.take(15), it.selection)
                    }
                    clientPhone = formatPhoneNumber(newValue)
                },
                label = { Text("Телефон") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true
            )
            
            OutlinedTextField(
                value = deviceName,
                onValueChange = { deviceName = it },
                label = { Text("Назва техніки") },
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = faultDesc,
                onValueChange = { faultDesc = it },
                label = { Text("Опис несправності") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )
            
            OutlinedTextField(
                value = costLabor,
                onValueChange = { costLabor = it },
                label = { Text("Вартість роботи (грн)") },
                modifier = Modifier.fillMaxWidth()
            )
            
            // Executor dropdown
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = executor,
                    onValueChange = { },
                    label = { Text("Виконавець") },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
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
                    executors.forEach { exec ->
                        DropdownMenuItem(
                            text = { Text(exec.name) },
                            onClick = {
                                executor = exec.name
                                showExecutorDropdown = false
                            }
                        )
                    }
                    if (executors.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("Андрій") },
                            onClick = {
                                executor = "Андрій"
                                showExecutorDropdown = false
                            }
                        )
                    }
                }
            }
            
            // Status dropdown
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = status,
                    onValueChange = { },
                    label = { Text("Статус") },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { showStatusDropdown = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = "Виберіть статус")
                        }
                    }
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
                            }
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Server connection warning
            if (!isConnected) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Text(
                            text = "Сервер не підключено. Неможливо створити ремонт.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            Button(
                onClick = {
                    if (!isConnected) {
                        showServerNotConnectedDialog = true
                        return@Button
                    }
                    if (isSaving || isLoading || isCreatingRepair) return@Button
                    
                    isSaving = true
                    isCreatingRepair = true
                    
                    // Notify SyncManager to block sync
                    viewModel.setCreatingRepair(true)
                    
                    // Get current date/time in ISO format (same as desktop app)
                    val now = Instant.now()
                    val zoneId = ZoneId.systemDefault()
                    val currentDateTime = now.atZone(zoneId)
                    val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")
                    val currentDateString = currentDateTime.format(dateTimeFormatter)
                    
                    val repair = Repair(
                        receiptId = receiptId.toIntOrNull() ?: 0,
                        deviceName = deviceName,
                        faultDesc = faultDesc,
                        costLabor = costLabor.toDoubleOrNull() ?: 0.0,
                        totalCost = costLabor.toDoubleOrNull() ?: 0.0,
                        status = status, // Server will convert string status to number
                        clientName = clientName,
                        clientPhone = clientPhone.text,
                        executor = executor,
                        dateStart = currentDateString,
                        dateEnd = currentDateString
                    )
                    viewModel.createRepair(
                        repair = repair,
                        onSuccess = {
                            isSaving = false
                            isCreatingRepair = false
                            viewModel.setCreatingRepair(false)
                            onSuccess()
                        },
                        onError = { 
                            isSaving = false
                            isCreatingRepair = false
                            viewModel.setCreatingRepair(false)
                        }
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving && !isLoading && !isCreatingRepair && isConnected
            ) {
                if (isSaving || isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Зберегти")
                }
            }
        }
        
        // Server not connected dialog
        if (showServerNotConnectedDialog) {
            AlertDialog(
                onDismissRequest = { showServerNotConnectedDialog = false },
                title = { Text("Сервер не підключено") },
                text = { 
                    Text("Для створення ремонту необхідно підключення до сервера на ПК. Перевірте налаштування підключення.")
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


