package com.servicecenter.ui.screens.warehouse

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.ui.screens.warehouse.WarehouseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignBarcodeDialog(
    barcode: String,
    onDismiss: () -> Unit,
    onAssign: (Int) -> Unit,
    viewModel: WarehouseViewModel = hiltViewModel()
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedSupplier by remember { mutableStateOf<String?>(null) }
    var showSupplierDropdown by remember { mutableStateOf(false) }
    
    val suppliers by viewModel.suppliers.collectAsState(initial = emptyList())
    val items by viewModel.filteredItems.collectAsState(initial = emptyList())
    
    LaunchedEffect(Unit) {
        viewModel.loadSuppliers()
        viewModel.syncWarehouseItems()
    }
    
    LaunchedEffect(searchQuery, selectedSupplier) {
        viewModel.setSearchQuery(searchQuery)
        viewModel.setSelectedSupplier(selectedSupplier)
    }
    
    // Filter only items in stock that don't have a barcode yet
    val availableItems = items.filter { it.inStock && (it.barcode == null || it.barcode.isEmpty()) }
    
    var selectedItemForConfirm by remember { mutableStateOf<WarehouseItem?>(null) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Призначити штрих-код") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Штрих-код: $barcode",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                
                Text(
                    text = "Оберіть товар для призначення штрих-коду:",
                    style = MaterialTheme.typography.bodySmall
                )
                
                // Search field
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Пошук по артикулу або назві...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true
                )
                
                // Supplier filter
                Box(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = selectedSupplier ?: "Всі постачальники",
                        onValueChange = { },
                        readOnly = true,
                        modifier = Modifier.fillMaxWidth(),
                        trailingIcon = {
                            IconButton(onClick = { showSupplierDropdown = true }) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }
                    )
                    
                    DropdownMenu(
                        expanded = showSupplierDropdown,
                        onDismissRequest = { showSupplierDropdown = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Всі постачальники") },
                            onClick = {
                                selectedSupplier = null
                                showSupplierDropdown = false
                            }
                        )
                        suppliers.forEach { supplier ->
                            DropdownMenuItem(
                                text = { Text(supplier) },
                                onClick = {
                                    selectedSupplier = supplier
                                    showSupplierDropdown = false
                                }
                            )
                        }
                    }
                }
                
                // Items list
                if (availableItems.isEmpty()) {
                    Text(
                        text = "Немає доступних товарів",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(16.dp)
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 200.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(availableItems) { item ->
                            Card(
                                onClick = { selectedItemForConfirm = item },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Text(
                                        text = item.name,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    if (item.productCode != null) {
                                        Text(
                                            text = "Артикул: ${item.productCode}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    if (item.supplier != null) {
                                        Text(
                                            text = "Постачальник: ${item.supplier}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
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
            TextButton(onClick = onDismiss) {
                Text("Скасувати")
            }
        }
    )
    
    // Confirmation dialog
    selectedItemForConfirm?.let { item ->
        AlertDialog(
            onDismissRequest = { selectedItemForConfirm = null },
            title = { Text("Підтвердження") },
            text = {
                Column {
                    Text("Призначити штрих-код \"$barcode\" товару:")
                    Spacer(modifier = Modifier.height(8.dp))
                                            Text(
                                                text = item.name,
                                                style = MaterialTheme.typography.bodyLarge,
                                                fontWeight = FontWeight.Bold
                                            )
                    if (item.productCode != null) {
                        Text("Артикул: ${item.productCode}")
                    }
                    if (item.supplier != null) {
                        Text("Постачальник: ${item.supplier}")
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onAssign(item.id)
                        selectedItemForConfirm = null
                    }
                ) {
                    Text("Підтвердити")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedItemForConfirm = null }) {
                    Text("Скасувати")
                }
            }
        )
    }
}

