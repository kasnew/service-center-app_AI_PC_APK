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
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    val groupByType by viewModel.groupByType.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    
    var showSupplierDropdown by remember { mutableStateOf(false) }
    var itemToEditBarcode by remember { mutableStateOf<WarehouseItem?>(null) }
    var showServerNotConnectedDialog by remember { mutableStateOf(false) }
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    
    LaunchedEffect(Unit) {
        viewModel.loadSuppliers()
        viewModel.syncWarehouseItems()
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
                                text = "Склад",
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                        
                        ConnectionIndicator()
                    }
                }
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
            Column(
                modifier = Modifier.fillMaxSize()
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
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = androidx.compose.ui.graphics.Color.White,
                    unfocusedContainerColor = androidx.compose.ui.graphics.Color.White,
                    disabledContainerColor = androidx.compose.ui.graphics.Color.White
                )
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
                
                Spacer(modifier = Modifier.width(24.dp))
                
                Checkbox(
                    checked = groupByType,
                    onCheckedChange = { viewModel.setGroupByType(it) }
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Групувати",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.clickable { viewModel.setGroupByType(!groupByType) }
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
                            showSupplierDropdown = true 
                        },
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = androidx.compose.ui.graphics.Color.White,
                        unfocusedContainerColor = androidx.compose.ui.graphics.Color.White,
                        disabledContainerColor = androidx.compose.ui.graphics.Color.White
                    ),
                    trailingIcon = {
                        IconButton(onClick = { 
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
}

@Composable
fun WarehouseItemCard(
    item: WarehouseItem,
    onEditBarcode: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = if (item.quantity > 1) 4.dp else 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (item.quantity > 1) androidx.compose.ui.graphics.Color(0xFFF0F7FF) else androidx.compose.ui.graphics.Color.White
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                if (item.quantity > 1) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = CircleShape,
                        modifier = Modifier.padding(start = 8.dp)
                    ) {
                        Text(
                            text = "x${item.quantity}",
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Black),
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }
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
