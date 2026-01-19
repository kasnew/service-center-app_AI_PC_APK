package com.chipzone.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chipzone.data.models.Repair
import com.chipzone.data.models.Product
import com.chipzone.data.repositories.ProductRepository
import com.chipzone.ui.viewmodels.RepairDisplay
import androidx.hilt.navigation.compose.hiltViewModel
import com.chipzone.ui.viewmodels.ProductsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditRepairDialog(
    repairDisplay: RepairDisplay,
    onDismiss: () -> Unit,
    onSave: (Repair) -> Unit,
    productsViewModel: ProductsViewModel = hiltViewModel()
) {
    val repair = repairDisplay.repair
    
    // Format phone number function
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
                    // Format: 123-456-78-90
                    val part1 = digits.substring(0, minOf(3, digits.length))
                    val part2 = if (digits.length > 3) digits.substring(3, minOf(6, digits.length)) else ""
                    val part3 = if (digits.length > 6) digits.substring(6, minOf(8, digits.length)) else ""
                    val part4 = if (digits.length > 8) digits.substring(8, minOf(10, digits.length)) else ""
                    "$part1-$part2-$part3-$part4"
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("EditRepairDialog", "Error formatting phone: ${e.message}", e)
            return phone
        }
    }
    
    var clientName by remember { mutableStateOf(repairDisplay.clientName ?: "") }
    var clientPhone by remember { mutableStateOf(formatPhoneNumber(repairDisplay.clientPhone ?: "")) }
    var deviceName by remember { mutableStateOf(repair.deviceName ?: "") }
    var faultDesc by remember { mutableStateOf(repair.faultDesc ?: "") }
    var workDone by remember { mutableStateOf(repair.workDone ?: "") }
    var costLabor by remember { mutableStateOf(repair.costLabor.toInt().toString()) }
    var status by remember { mutableStateOf(repair.status) }
    var executor by remember { mutableStateOf(repair.executor ?: "Андрій") }
    var note by remember { mutableStateOf(repair.note ?: "") }
    var showStatusDropdown by remember { mutableStateOf(false) }
    var showAddProductDialog by remember { mutableStateOf(false) }
    var selectedProducts by remember { mutableStateOf<List<Product>>(emptyList()) }
    
    // Load in-stock products
    val allProducts by productsViewModel.products.collectAsState(initial = emptyList())
    val inStockProducts = remember(allProducts) {
        allProducts.filter { it.inStock }
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
                                // Дозволяємо максимум 13 символів (формат: 123-456-78-90)
                                if (it.length <= 13) {
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
                                Icons.Default.Devices,
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
                                Icon(Icons.Default.Devices, contentDescription = null)
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
                            onValueChange = { 
                                // Дозволяємо тільки цілі числа
                                val filtered = it.filter { char -> char.isDigit() }
                                if (filtered.isNotEmpty() || it.isEmpty()) {
                                    costLabor = filtered
                                }
                            },
                            label = { Text("Вартість роботи (грн)") },
                            leadingIcon = {
                                Icon(Icons.Default.AttachMoney, contentDescription = null)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
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
                                Icon(Icons.Default.Person, contentDescription = null)
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
                
                // Parts/Products Section
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
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.Inventory,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.secondary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    "Товари зі складу",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.secondary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Button(
                                onClick = { showAddProductDialog = true },
                                modifier = Modifier.size(40.dp),
                                contentPadding = PaddingValues(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Додати товар",
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        
                        if (selectedProducts.isEmpty()) {
                            Text(
                                "Товари не додані",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else {
                            selectedProducts.forEach { product: Product ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = product.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = "%.2f ₴".format(product.sellPrice),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    IconButton(
                                        onClick = {
                                            selectedProducts = selectedProducts.filter { it.id != product.id }
                                        }
                                    ) {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = "Видалити",
                                            tint = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val laborCost = costLabor.toIntOrNull()?.toDouble() ?: 0.0
                    val partsCost = selectedProducts.sumOf { it.sellPrice }
                    val updatedRepair = repair.copy(
                        deviceName = deviceName,
                        faultDesc = faultDesc,
                        workDone = workDone,
                        costLabor = laborCost,
                        totalCost = laborCost + partsCost,
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
    
    // Add Product Dialog
    if (showAddProductDialog) {
        AlertDialog(
            onDismissRequest = { showAddProductDialog = false },
            title = { Text("Додати товар зі складу") },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    inStockProducts.filter { product: Product ->
                        !selectedProducts.any { it.id == product.id }
                    }.forEach { product: Product ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedProducts = selectedProducts + product
                                    showAddProductDialog = false
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = product.name,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Medium
                                    )
                                    product.productCode?.let {
                                        Text(
                                            text = "Артикул: $it",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Text(
                                        text = "%.2f ₴".format(product.sellPrice),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Додати",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                    if (inStockProducts.filter { product: Product ->
                        !selectedProducts.any { it.id == product.id }
                    }.isEmpty()) {
                        Text(
                            "Немає доступних товарів",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showAddProductDialog = false }) {
                    Text("Закрити")
                }
            }
        )
    }
}

