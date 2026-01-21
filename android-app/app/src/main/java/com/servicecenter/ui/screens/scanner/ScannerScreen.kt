package com.servicecenter.ui.screens.scanner

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.ui.screens.warehouse.AssignBarcodeDialog
import com.servicecenter.data.models.WarehouseItem
import com.servicecenter.ui.screens.scanner.ScanModeSelectionDialog
import com.servicecenter.ui.screens.scanner.ScanMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScannerScreen(
    onBack: () -> Unit,
    viewModel: ScannerViewModel = hiltViewModel()
) {
    val scannedItem by viewModel.scannedItem.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val scannedBarcode by viewModel.scannedBarcode.collectAsState()
    
    val context = LocalContext.current
    var isScanning by remember { mutableStateOf(false) }
    var showResultDialog by remember { mutableStateOf(false) }
    var showModeSelectionDialog by remember { mutableStateOf(true) }
    var selectedScanMode by remember { mutableStateOf<ScanMode?>(null) }
    
    // Gallery image picker launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null && selectedScanMode == ScanMode.GALLERY) {
            viewModel.processImageFromGallery(uri, context)
        }
    }
    
    // Permission launcher for gallery access
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted && selectedScanMode == ScanMode.GALLERY) {
            galleryLauncher.launch("image/*")
        }
    }
    
    // Stop scanning when barcode is scanned
    LaunchedEffect(scannedBarcode) {
        if (scannedBarcode != null) {
            isScanning = false
            showResultDialog = true
            selectedScanMode = null
        }
    }
    
    // Close result dialog when item is found or assigned
    LaunchedEffect(scannedItem) {
        if (scannedItem != null) {
            showResultDialog = false
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Сканер") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (isScanning && selectedScanMode != null) {
                // Scanner view
                BarcodeScannerView(
                    onBarcodeScanned = { barcode ->
                        viewModel.scanBarcode(barcode)
                    },
                    isActive = isScanning,
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
            } else {
                // Show result dialog
                if (showResultDialog) {
                    ScanResultDialog(
                        scannedBarcode = scannedBarcode,
                        scannedItem = scannedItem,
                        isLoading = isLoading,
                        error = error,
                        onDismiss = {
                            showResultDialog = false
                            viewModel.clearScannedData()
                            isScanning = true
                        },
                        onAssign = { itemId ->
                            if (scannedBarcode != null) {
                                viewModel.assignBarcodeToItem(itemId, scannedBarcode!!)
                                // Dialog will update when item is loaded
                            }
                        },
                        onSearchBarcode = { barcode ->
                            viewModel.scanBarcode(barcode)
                        },
                        onScanAgain = {
                            showResultDialog = false
                            viewModel.clearScannedData()
                            selectedScanMode = null
                            showModeSelectionDialog = true
                            isScanning = false
                        },
                        onSell = { item ->
                            showResultDialog = false
                            viewModel.startSellingItem(item)
                        }
                    )
                } else {
                    scannedItem?.let { item ->
                        // Show item details in full screen after assignment
                        ItemDetailsView(
                            item = item,
                            onBack = {
                                viewModel.clearScannedData()
                                selectedScanMode = null
                                showModeSelectionDialog = true
                                isScanning = false
                            },
                            onSell = {
                                viewModel.startSellingItem(item)
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
            
            // Show sell dialog
            val showSellDialog by viewModel.showSellDialog.collectAsState()
            val sellItem by viewModel.sellItem.collectAsState()
            if (showSellDialog && sellItem != null) {
                SellItemDialog(
                    item = sellItem!!,
                    onDismiss = {
                        viewModel.cancelSelling()
                    },
                    onConfirm = { price, paymentType ->
                        viewModel.sellItem(price, paymentType)
                    }
                )
            }
            
            // Show scan mode selection dialog
            if (showModeSelectionDialog) {
                ScanModeSelectionDialog(
                    onModeSelected = { mode ->
                        selectedScanMode = mode
                        showModeSelectionDialog = false
                        if (mode == ScanMode.GALLERY) {
                            // Request permission and open gallery
                            val permission = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                                Manifest.permission.READ_MEDIA_IMAGES
                            } else {
                                Manifest.permission.READ_EXTERNAL_STORAGE
                            }
                            if (ContextCompat.checkSelfPermission(context, permission) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                galleryLauncher.launch("image/*")
                            } else {
                                permissionLauncher.launch(permission)
                            }
                        } else {
                            isScanning = true
                        }
                    },
                    onDismiss = {
                        showModeSelectionDialog = false
                        onBack()
                    }
                )
            }
        }
    }
}

@Composable
fun ScanResultDialog(
    scannedBarcode: String?,
    scannedItem: WarehouseItem?,
    isLoading: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onAssign: (Int) -> Unit,
    onScanAgain: () -> Unit,
    onSearchBarcode: (String) -> Unit,
    onSell: (WarehouseItem) -> Unit = {}
) {
    var showAssignDialog by remember { mutableStateOf(false) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            if (scannedItem != null) {
                Text("Товар знайдено")
            } else {
                Text("Штрих-код не знайдено")
            }
        },
        text = {
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (error != null) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error
                )
            } else if (scannedItem != null) {
                // Show item information
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Штрих-код: $scannedBarcode",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Divider()
                    Text(
                        text = scannedItem.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    if (scannedItem.productCode != null) {
                        Text(
                            text = "Артикул: ${scannedItem.productCode}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    if (scannedItem.supplier != null) {
                        Text(
                            text = "Постачальник: ${scannedItem.supplier}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    
                    // Cost (закупівельна вартість)
                    if (scannedItem.costUah > 0) {
                        Text(
                            text = "Вартість закупки: ${"%.2f".format(scannedItem.costUah)} грн",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    // Price (вартість продажу)
                    if (scannedItem.priceUah > 0) {
                        Text(
                            text = if (scannedItem.inStock) 
                                "Вартість продажу: ${"%.2f".format(scannedItem.priceUah)} грн"
                            else 
                                "Вартість продажу: ${"%.2f".format(scannedItem.priceUah)} грн",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    
                    Divider()
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Статус:",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        AssistChip(
                            onClick = { },
                            label = {
                                Text(
                                    text = if (scannedItem.inStock) "На складі" else "Продано",
                                    style = MaterialTheme.typography.labelSmall
                                )
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = if (scannedItem.inStock)
                                    MaterialTheme.colorScheme.primaryContainer
                                else
                                    MaterialTheme.colorScheme.errorContainer
                            )
                        )
                    }
                    if (!scannedItem.inStock && scannedItem.dateSold != null) {
                        Text(
                            text = "Дата продажу: ${scannedItem.dateSold}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (scannedItem.receiptId != null) {
                            Text(
                                text = "Квитанція: #${scannedItem.receiptId}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else if (scannedBarcode != null) {
                // Show "not found" message with editable barcode
                var editableBarcode by remember { mutableStateOf(scannedBarcode) }
                
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Товар не знайдено",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold
                    )
                    
                    OutlinedTextField(
                        value = editableBarcode,
                        onValueChange = { editableBarcode = it },
                        label = { Text("Штрих-код (можна змінити)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        trailingIcon = {
                            if (editableBarcode != scannedBarcode) {
                                IconButton(onClick = { 
                                    onSearchBarcode(editableBarcode)
                                }) {
                                    Icon(Icons.Default.Search, contentDescription = "Повторити пошук")
                                }
                            }
                        }
                    )
                    
                    Text(
                        text = "Товар з таким штрих-кодом не знайдено в базі даних. Ви можете виправити його вище або прив'язати до існуючого товару.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        },
        confirmButton = {
            if (scannedItem == null && scannedBarcode != null && !isLoading) {
                Button(
                    onClick = {
                        showAssignDialog = true
                    }
                ) {
                    Text("Прив'язати до товару")
                }
            } else if (scannedItem != null && scannedItem.inStock) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { onSell(scannedItem) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Реалізувати")
                    }
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("ОК")
                    }
                }
            } else {
                Button(onClick = onDismiss) {
                    Text("ОК")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onScanAgain) {
                Text("Сканувати ще")
            }
        }
    )
    
    // Show assign dialog when "Прив'язати до товару" is clicked
    if (showAssignDialog && scannedBarcode != null) {
        AssignBarcodeDialog(
            barcode = scannedBarcode,
            onDismiss = {
                showAssignDialog = false
            },
            onAssign = { itemId ->
                onAssign(itemId)
                showAssignDialog = false
                // Don't dismiss main dialog - wait for item to load
            }
        )
    }
}

@Composable
fun ItemDetailsView(
    item: WarehouseItem,
    onBack: () -> Unit,
    onSell: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                if (item.productCode != null) {
                    Text(
                        text = "Артикул: ${item.productCode}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                if (item.supplier != null) {
                    Text(
                        text = "Постачальник: ${item.supplier}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                // Cost (закупівельна вартість)
                if (item.costUah > 0) {
                    Text(
                        text = "Вартість закупки: ${"%.2f".format(item.costUah)} грн",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                // Price (вартість продажу)
                if (item.priceUah > 0) {
                    Text(
                        text = if (item.inStock) 
                            "Вартість продажу: ${"%.2f".format(item.priceUah)} грн"
                        else 
                            "Вартість продажу: ${"%.2f".format(item.priceUah)} грн",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                
                Divider(modifier = Modifier.padding(vertical = 8.dp))
                
                // Stock status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Статус:",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    AssistChip(
                        onClick = { },
                        label = {
                            Text(
                                text = if (item.inStock) "На складі" else "Продано",
                                style = MaterialTheme.typography.labelSmall
                            )
                        },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (item.inStock)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.errorContainer
                        )
                    )
                }
                
                // Sale info if sold
                if (!item.inStock && item.dateSold != null) {
                    Text(
                        text = "Дата продажу: ${item.dateSold}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    if (item.receiptId != null) {
                        Text(
                            text = "Квитанція: #${item.receiptId}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        
        if (item.inStock) {
            Button(
                onClick = onSell,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Реалізувати")
            }
        }
        
        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Сканувати ще")
        }
    }
}

@Composable
fun SellItemDialog(
    item: WarehouseItem,
    onDismiss: () -> Unit,
    onConfirm: (Double, String) -> Unit
) {
    var price by remember { mutableStateOf(item.priceUah.toString()) }
    var paymentType by remember { mutableStateOf("Готівка") }
    var showPaymentTypeDropdown by remember { mutableStateOf(false) }
    
    val priceValue = price.toDoubleOrNull() ?: 0.0
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Реалізація товару") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                // Display purchase cost if available
                if (item.costUah > 0) {
                    Text(
                        text = "Вартість закупки: ${"%.2f".format(item.costUah)} грн",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Ціна реалізації (грн)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                    )
                )
                
                // Payment type dropdown
                Box(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = paymentType,
                        onValueChange = { },
                        readOnly = true,
                        label = { Text("Спосіб оплати") },
                        modifier = Modifier.fillMaxWidth(),
                        trailingIcon = {
                            IconButton(onClick = { showPaymentTypeDropdown = true }) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }
                    )
                    
                    DropdownMenu(
                        expanded = showPaymentTypeDropdown,
                        onDismissRequest = { showPaymentTypeDropdown = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Готівка") },
                            onClick = {
                                paymentType = "Готівка"
                                showPaymentTypeDropdown = false
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Картка") },
                            onClick = {
                                paymentType = "Картка"
                                showPaymentTypeDropdown = false
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (priceValue > 0) {
                        onConfirm(priceValue, paymentType)
                    }
                },
                enabled = priceValue > 0
            ) {
                Text("Сплатити")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Відміна")
            }
        }
    )
}


