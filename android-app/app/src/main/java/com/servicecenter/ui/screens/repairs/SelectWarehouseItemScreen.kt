package com.servicecenter.ui.screens.repairs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.data.repository.RepairRepository
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.warehouse.WarehouseViewModel
import com.servicecenter.ui.screens.repairs.RepairsViewModel
import com.servicecenter.ui.screens.scanner.BarcodeScannerView
import com.servicecenter.ui.screens.scanner.ScanModeSelectionDialog
import com.servicecenter.ui.screens.scanner.ScanMode
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SelectWarehouseItemScreen(
    repairId: Int,
    receiptId: Int,
    onBack: () -> Unit,
    onItemSelected: (WarehouseItem) -> Unit,
    warehouseViewModel: com.servicecenter.ui.screens.warehouse.WarehouseViewModel = hiltViewModel(),
    repairsViewModel: RepairsViewModel = hiltViewModel()
) {
    val items by warehouseViewModel.filteredItems.collectAsState(initial = emptyList())
    val suppliers by warehouseViewModel.suppliers.collectAsState(initial = emptyList())
    val selectedSupplier by warehouseViewModel.selectedSupplier.collectAsState()
    val searchQuery by warehouseViewModel.searchQuery.collectAsState()
    val isLoading by warehouseViewModel.isLoading.collectAsState()
    
    var showSupplierDropdown by remember { mutableStateOf(false) }
    var selectedItem by remember { mutableStateOf<WarehouseItem?>(null) }
    var showPriceDialog by remember { mutableStateOf(false) }
    var priceInput by remember { mutableStateOf("") }
    var showScanner by remember { mutableStateOf(false) }
    var showModeSelectionDialog by remember { mutableStateOf(false) }
    var selectedScanMode by remember { mutableStateOf<ScanMode?>(null) }
    var barcodeSearchError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    LaunchedEffect(Unit) {
        warehouseViewModel.loadSuppliers()
        warehouseViewModel.syncWarehouseItems()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Вибір товару") },
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
            // Search field with barcode scanner button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { warehouseViewModel.setSearchQuery(it) },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Пошук по артикулу або назві...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text)
                )
                IconButton(
                    onClick = { showModeSelectionDialog = true },
                    modifier = Modifier.size(56.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.QrCodeScanner,
                        contentDescription = "Сканувати штрих-код",
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            
            // Barcode search error message
            barcodeSearchError?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
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
                            android.util.Log.d("SelectWarehouseItemScreen", "Supplier field clicked, suppliers count: ${suppliers.size}")
                            showSupplierDropdown = true 
                        },
                    trailingIcon = {
                        IconButton(onClick = { 
                            android.util.Log.d("SelectWarehouseItemScreen", "Supplier dropdown icon clicked, suppliers count: ${suppliers.size}")
                            showSupplierDropdown = true 
                        }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                    }
                )
                
                DropdownMenu(
                    expanded = showSupplierDropdown,
                    onDismissRequest = { 
                        android.util.Log.d("SelectWarehouseItemScreen", "Supplier dropdown dismissed")
                        showSupplierDropdown = false 
                    }
                ) {
                    DropdownMenuItem(
                        text = { Text("Всі постачальники") },
                        onClick = {
                            android.util.Log.d("SelectWarehouseItemScreen", "Selected: Всі постачальники")
                            warehouseViewModel.setSelectedSupplier(null)
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
                                    android.util.Log.d("SelectWarehouseItemScreen", "Selected supplier: $supplier")
                                    warehouseViewModel.setSelectedSupplier(supplier)
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
                        WarehouseItemSelectableCard(
                            item = item,
                            isSelected = selectedItem?.id == item.id,
                            onClick = {
                                selectedItem = item
                                priceInput = item.priceUah.toString()
                                showPriceDialog = true
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
    }
    
    // Price confirmation dialog
    if (showPriceDialog && selectedItem != null) {
        AlertDialog(
            onDismissRequest = { 
                showPriceDialog = false
                selectedItem = null
            },
            title = { Text("Підтвердження") },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Товар: ${selectedItem!!.name}",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    
                    // Display purchase cost if available
                    if (selectedItem!!.costUah > 0) {
                        Text(
                            text = "Вартість закупки: ${"%.2f".format(selectedItem!!.costUah)} грн",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    OutlinedTextField(
                        value = priceInput,
                        onValueChange = { priceInput = it },
                        label = { Text("Ціна продажу (грн)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val price = priceInput.toDoubleOrNull() ?: selectedItem!!.priceUah
                        val itemWithPrice = selectedItem!!.copy(priceUah = price)
                        
                        // Add item to repair
                        scope.launch {
                            try {
                                val result = repairsViewModel.addPartToRepair(
                                    repairId = repairId,
                                    receiptId = receiptId,
                                    partId = itemWithPrice.id,
                                    priceUah = itemWithPrice.priceUah,
                                    costUah = itemWithPrice.costUah,
                                    supplier = itemWithPrice.supplier ?: "",
                                    name = itemWithPrice.name,
                                    isPaid = false,
                                    dateEnd = null
                                )
                                
                                if (result.isSuccess) {
                                    onItemSelected(itemWithPrice)
                                } else {
                                    android.util.Log.e("SelectWarehouseItemScreen", "Failed to add part: ${result.exceptionOrNull()?.message}")
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("SelectWarehouseItemScreen", "Error adding part: ${e.message}", e)
                            }
                        }
                        
                        showPriceDialog = false
                        selectedItem = null
                    }
                ) {
                    Text("Додати")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showPriceDialog = false
                        selectedItem = null
                    }
                ) {
                    Text("Скасувати")
                }
            }
        )
    }
    
    // Barcode scanner dialog
    if (showScanner) {
        val lifecycleOwner = LocalLifecycleOwner.current
        Dialog(
            onDismissRequest = { 
                showScanner = false
                barcodeSearchError = null
            },
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false
            )
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Сканувати штрих-код",
                            style = MaterialTheme.typography.titleLarge
                        )
                        IconButton(onClick = { 
                            showScanner = false
                            barcodeSearchError = null
                        }) {
                            Text("✕", style = MaterialTheme.typography.titleLarge)
                        }
                    }
                    
                    // Scanner view
                    key(showScanner) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .weight(1f)
                        ) {
                            if (showScanner && selectedScanMode != null) {
                                BarcodeScannerView(
                                    onBarcodeScanned = { scannedBarcode ->
                                        android.util.Log.d("SelectWarehouseItemScreen", "Barcode scanned: $scannedBarcode")
                                        scope.launch {
                                            try {
                                                // Search for item by barcode
                                                val foundItem = warehouseViewModel.findItemByBarcode(scannedBarcode)
                                                if (foundItem != null && foundItem.inStock) {
                                                    // Item found and in stock - select it
                                                    selectedItem = foundItem
                                                    priceInput = foundItem.priceUah.toString()
                                                    showPriceDialog = true
                                                    showScanner = false
                                                    selectedScanMode = null
                                                    barcodeSearchError = null
                                                } else if (foundItem != null && !foundItem.inStock) {
                                                    // Item found but sold
                                                    barcodeSearchError = "Товар з штрих-кодом \"$scannedBarcode\" вже продано"
                                                    showScanner = false
                                                    selectedScanMode = null
                                                } else {
                                                    // Item not found
                                                    barcodeSearchError = "Товар з штрих-кодом \"$scannedBarcode\" не знайдено"
                                                    showScanner = false
                                                    selectedScanMode = null
                                                }
                                            } catch (e: Exception) {
                                                android.util.Log.e("SelectWarehouseItemScreen", "Error searching by barcode: ${e.message}", e)
                                                barcodeSearchError = "Помилка при пошуку товару: ${e.message}"
                                                showScanner = false
                                                selectedScanMode = null
                                            }
                                        }
                                    },
                                    isActive = showScanner,
                                    scanMode = selectedScanMode!!,
                                    modifier = Modifier.fillMaxSize()
                                )
                                
                                // Overlay with scanning frame
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .size(250.dp)
                                            .padding(16.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.1f)
                                        )
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "Наведіть камеру на штрих-код",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Scan mode selection dialog
    if (showModeSelectionDialog) {
        ScanModeSelectionDialog(
            onModeSelected = { mode ->
                selectedScanMode = mode
                showModeSelectionDialog = false
                showScanner = true
            },
            onDismiss = {
                showModeSelectionDialog = false
            }
        )
    }
}

@Composable
fun WarehouseItemSelectableCard(
    item: WarehouseItem,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 2.dp
        ),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) 
                MaterialTheme.colorScheme.primaryContainer 
            else 
                MaterialTheme.colorScheme.surface
        )
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
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                
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
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "%.2f грн".format(item.priceUah),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                if (item.costUah > 0) {
                    Text(
                        text = "Собівартість: %.2f грн".format(item.costUah),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
                if (isSelected) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = "Вибрано",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

