package com.servicecenter.ui.screens.warehouse

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.settings.SettingsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WarehouseScreen(
    onBack: () -> Unit,
    viewModel: WarehouseViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val items by viewModel.filteredItems.collectAsState(initial = emptyList())
    val suppliers by viewModel.suppliers.collectAsState(initial = emptyList())
    val selectedSupplier by viewModel.selectedSupplier.collectAsState()
    val showInStockOnly by viewModel.showInStockOnly.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    
    var showSupplierDropdown by remember { mutableStateOf(false) }
    var itemToEditBarcode by remember { mutableStateOf<WarehouseItem?>(null) }
    var showServerNotConnectedDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    
    LaunchedEffect(Unit) {
        viewModel.loadSuppliers()
        viewModel.syncWarehouseItems()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Склад") },
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
        ) {
            // Search field
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Пошук по артикулу або назві...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true
            )
            
            // In Stock filter checkbox
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = showInStockOnly,
                    onCheckedChange = { viewModel.setShowInStockOnly(it) }
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "В наявності",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.clickable { viewModel.setShowInStockOnly(!showInStockOnly) }
                )
            }
            
            // Supplier filter
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                OutlinedTextField(
                    value = selectedSupplier ?: "Всі постачальники",
                    onValueChange = {},
                    readOnly = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { 
                            android.util.Log.d("WarehouseScreen", "Supplier field clicked, suppliers count: ${suppliers.size}")
                            showSupplierDropdown = true 
                        },
                    trailingIcon = {
                        IconButton(onClick = { 
                            android.util.Log.d("WarehouseScreen", "Supplier dropdown icon clicked, suppliers count: ${suppliers.size}")
                            showSupplierDropdown = true 
                        }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                    }
                )
                
                DropdownMenu(
                    expanded = showSupplierDropdown,
                    onDismissRequest = { 
                        android.util.Log.d("WarehouseScreen", "Supplier dropdown dismissed")
                        showSupplierDropdown = false 
                    }
                ) {
                    DropdownMenuItem(
                        text = { Text("Всі постачальники") },
                        onClick = {
                            android.util.Log.d("WarehouseScreen", "Selected: Всі постачальники")
                            viewModel.setSelectedSupplier(null)
                            showSupplierDropdown = false
                        }
                    )
                    if (suppliers.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("Завантаження постачальників...") },
                            onClick = { }
                        )
                    } else {
                        suppliers.forEach { supplier ->
                            DropdownMenuItem(
                                text = { Text(supplier) },
                                onClick = {
                                    android.util.Log.d("WarehouseScreen", "Selected supplier: $supplier")
                                    viewModel.setSelectedSupplier(supplier)
                                    showSupplierDropdown = false
                                }
                            )
                        }
                    }
                }
            }
            
            // Items list
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(items) { item ->
                        WarehouseItemCard(
                            item = item,
                            onEditBarcode = {
                                if (isConnected) {
                                itemToEditBarcode = item
                                } else {
                                    showServerNotConnectedDialog = true
                                }
                            }
                        )
                    }
                    
                    if (items.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Немає товарів на складі",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // Edit barcode dialog
        itemToEditBarcode?.let { item ->
            EditBarcodeDialog(
                item = item,
                onDismiss = { itemToEditBarcode = null },
                onUpdate = { barcode ->
                    viewModel.updateBarcode(item.id, barcode)
                    itemToEditBarcode = null
                },
                onDelete = {
                    viewModel.deleteBarcode(item.id)
                    itemToEditBarcode = null
                },
                onCheckBarcodeUnique = { barcode, itemId ->
                    viewModel.checkBarcodeUnique(barcode, itemId)
                },
                isLoading = isLoading
            )
        }
        
        // Server not connected dialog
        if (showServerNotConnectedDialog) {
            AlertDialog(
                onDismissRequest = { showServerNotConnectedDialog = false },
                title = { Text("Сервер не підключено") },
                text = { 
                    Text("Для редагування товарів необхідно підключення до сервера на ПК. Перевірте налаштування підключення.")
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
fun WarehouseItemCard(
    item: WarehouseItem,
    onEditBarcode: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Text(
                text = item.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    if (item.productCode != null) {
                        Text(
                            text = "Артикул: ${item.productCode}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                    if (item.supplier != null) {
                        Text(
                            text = "Постачальник: ${item.supplier}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (item.barcode != null && item.barcode.isNotEmpty()) {
                            Text(
                                text = "Штрих-код: ${item.barcode}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            Text(
                                text = "Штрих-код не встановлено",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        IconButton(
                            onClick = onEditBarcode,
                            modifier = Modifier.size(40.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Редагувати штрих-код",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    if (item.priceUah > 0) {
                        Text(
                            text = "%.2f грн".format(item.priceUah),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (item.costUah > 0) {
                        Text(
                            text = "Собівартість: %.2f грн".format(item.costUah),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    }
}
