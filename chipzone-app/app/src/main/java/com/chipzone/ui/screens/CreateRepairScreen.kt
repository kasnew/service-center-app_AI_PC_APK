package com.chipzone.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chipzone.ui.components.ConnectionIndicator
import com.chipzone.ui.viewmodels.RepairsViewModel
import com.chipzone.ui.viewmodels.ExecutorsViewModel
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Capitalizes the first letter of a string if it's a letter
 */
fun capitalizeFirstLetter(text: String): String {
    if (text.isEmpty()) return text
    val firstChar = text.first()
    return if (firstChar.isLetter() && firstChar.isLowerCase()) {
        text.replaceFirstChar { it.uppercaseChar() }
    } else {
        text
    }
}

/**
 * Formats phone number to '123-456-78-90' format
 * Preserves cursor position correctly
 */
fun formatPhoneNumber(value: TextFieldValue): TextFieldValue {
    val text = value.text
    val cursorPosition = value.selection.start
    
    // Get digits only
    val digits = text.filter { it.isDigit() }
    if (digits.isEmpty()) {
        return TextFieldValue("", TextRange(0))
    }
    
    // Limit to 10 digits
    val limitedDigits = digits.take(10)
    
    // Format with dashes: 123-456-78-90
    val formatted = when {
        limitedDigits.length <= 3 -> limitedDigits
        limitedDigits.length <= 6 -> {
            "${limitedDigits.substring(0, 3)}-${limitedDigits.substring(3)}"
        }
        limitedDigits.length <= 8 -> {
            "${limitedDigits.substring(0, 3)}-${limitedDigits.substring(3, 6)}-${limitedDigits.substring(6)}"
        }
        else -> {
            "${limitedDigits.substring(0, 3)}-${limitedDigits.substring(3, 6)}-${limitedDigits.substring(6, 8)}-${limitedDigits.substring(8)}"
        }
    }
    
    // Calculate new cursor position
    // Count digits before cursor in original text
    val digitsBeforeCursor = text.substring(0, cursorPosition).count { it.isDigit() }
    
    // Find position in formatted string
    var newCursorPosition = 0
    var digitCount = 0
    for (i in formatted.indices) {
        if (formatted[i].isDigit()) {
            digitCount++
            if (digitCount > digitsBeforeCursor) {
                newCursorPosition = i
                break
            }
        }
        if (digitCount == digitsBeforeCursor) {
            newCursorPosition = i + 1
        }
    }
    
    // Ensure cursor is within bounds
    newCursorPosition = newCursorPosition.coerceIn(0, formatted.length)
    
    return TextFieldValue(
        text = formatted,
        selection = TextRange(newCursorPosition)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateRepairScreen(
    navController: NavController,
    viewModel: RepairsViewModel = hiltViewModel(),
    executorsViewModel: ExecutorsViewModel = hiltViewModel()
) {
    var receiptId by remember { mutableStateOf("") }
    var clientName by remember { mutableStateOf("") }
    var clientPhoneValue by remember { mutableStateOf(TextFieldValue("")) }
    var deviceName by remember { mutableStateOf("") }
    var faultDesc by remember { mutableStateOf("") }
    var costLabor by remember { mutableStateOf("") }
    var selectedStatus by remember { mutableStateOf("У черзі") }
    var isStatusDropdownExpanded by remember { mutableStateOf(false) }
    var selectedExecutor by remember { mutableStateOf("Андрій") }
    var isExecutorDropdownExpanded by remember { mutableStateOf(false) }
    var isLoadingReceiptId by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    val statusOptions = listOf(
        "У черзі",
        "У роботі",
        "Очікув. відпов./деталі",
        "Готовий до видачі",
        "Не додзвонилися",
        "Видано",
        "Одеса"
    )
    
    val executors by executorsViewModel.executors.collectAsState(initial = emptyList())
    val nextReceiptIdState by viewModel.nextReceiptId.collectAsState()
    
    // Load next receipt ID and executors when screen opens
    LaunchedEffect(Unit) {
        isLoadingReceiptId = true
        try {
            viewModel.loadNextReceiptId()
            
            if (executors.isNotEmpty()) {
                val andrii = executors.find { it.name == "Андрій" }
                selectedExecutor = andrii?.name ?: executors.firstOrNull()?.name ?: "Андрій"
            }
        } catch (e: Exception) {
            android.util.Log.e("CreateRepairScreen", "Error loading data: ${e.message}", e)
        } finally {
            isLoadingReceiptId = false
        }
    }
    
    // Update receiptId when nextReceiptIdState changes
    LaunchedEffect(nextReceiptIdState) {
        if (nextReceiptIdState != null && receiptId.isEmpty()) {
            receiptId = nextReceiptIdState.toString()
            isLoadingReceiptId = false
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Новий ремонт")
                        ConnectionIndicator()
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
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
            
            // Client name
            OutlinedTextField(
                value = clientName,
                onValueChange = { 
                    clientName = capitalizeFirstLetter(it)
                },
                label = { Text("Ім'я клієнта") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            // Client phone with formatting
            OutlinedTextField(
                value = clientPhoneValue,
                onValueChange = { newValue ->
                    clientPhoneValue = formatPhoneNumber(newValue)
                },
                label = { Text("Телефон") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                placeholder = { Text("123-456-78-90") }
            )
            
            // Device name
            OutlinedTextField(
                value = deviceName,
                onValueChange = { 
                    deviceName = capitalizeFirstLetter(it)
                },
                label = { Text("Назва техніки") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
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
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )
            
            // Executor dropdown
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = selectedExecutor,
                    onValueChange = { },
                    label = { Text("Виконавець") },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { isExecutorDropdownExpanded = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = "Виберіть виконавця")
                        }
                    }
                )
                
                DropdownMenu(
                    expanded = isExecutorDropdownExpanded,
                    onDismissRequest = { isExecutorDropdownExpanded = false }
                ) {
                    executors.forEach { executor ->
                        DropdownMenuItem(
                            text = { Text(executor.name) },
                            onClick = {
                                selectedExecutor = executor.name
                                isExecutorDropdownExpanded = false
                            }
                        )
                    }
                    if (executors.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("Андрій") },
                            onClick = {
                                selectedExecutor = "Андрій"
                                isExecutorDropdownExpanded = false
                            }
                        )
                    }
                }
            }
            
            // Status dropdown
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = selectedStatus,
                    onValueChange = { },
                    label = { Text("Статус") },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { isStatusDropdownExpanded = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = "Виберіть статус")
                        }
                    }
                )
                
                DropdownMenu(
                    expanded = isStatusDropdownExpanded,
                    onDismissRequest = { isStatusDropdownExpanded = false }
                ) {
                    statusOptions.forEach { status ->
                        DropdownMenuItem(
                            text = { Text(status) },
                            onClick = {
                                selectedStatus = status
                                isStatusDropdownExpanded = false
                            }
                        )
                    }
                }
            }
            
            // Error message
            errorMessage?.let {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = it,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = {
                    isLoading = true
                    errorMessage = null
                    
                    // Extract digits from formatted phone number
                    val phoneDigits = clientPhoneValue.text.filter { it.isDigit() }
                    val receiptIdInt = receiptId.toIntOrNull() ?: 0
                    
                    viewModel.createRepair(
                        clientName = clientName.trim(),
                        clientPhone = phoneDigits,
                        deviceName = deviceName.trim(),
                        faultDesc = faultDesc.trim(),
                        note = "",
                        status = selectedStatus,
                        executor = selectedExecutor,
                        receiptId = receiptIdInt,
                        onSuccess = {
                            navController.popBackStack()
                        },
                        onError = { error ->
                            errorMessage = error
                            isLoading = false
                        }
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && receiptId.isNotEmpty()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Зберегти")
                }
            }
        }
    }
}


