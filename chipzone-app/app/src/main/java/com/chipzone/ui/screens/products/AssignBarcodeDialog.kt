package com.chipzone.ui.screens.products

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
import com.chipzone.data.models.Product
import com.chipzone.ui.viewmodels.ProductsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignBarcodeDialog(
    barcode: String,
    onDismiss: () -> Unit,
    onAssign: (Int) -> Unit,
    viewModel: ProductsViewModel = hiltViewModel()
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedSupplier by remember { mutableStateOf<String?>(null) }
    var showSupplierDropdown by remember { mutableStateOf(false) }
    
    val products by viewModel.products.collectAsState(initial = emptyList())
    
    LaunchedEffect(Unit) {
        viewModel.searchProducts("")
    }
    
    LaunchedEffect(searchQuery) {
        viewModel.searchProducts(searchQuery)
    }
    
    // Get unique suppliers from products
    val suppliers = remember(products) {
        products.mapNotNull { it.supplier }.distinct().sorted()
    }
    
    // Filter products
    val filteredProducts = remember(products, selectedSupplier) {
        if (selectedSupplier == null) {
            products
        } else {
            products.filter { it.supplier == selectedSupplier }
        }
    }
    
    // Filter only in stock products
    val availableProducts = filteredProducts.filter { it.inStock }
    
    var selectedProductForConfirm by remember { mutableStateOf<Product?>(null) }
    
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
                if (suppliers.isNotEmpty()) {
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
                }
                
                // Products list
                if (availableProducts.isEmpty()) {
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
                        items(availableProducts) { product ->
                            Card(
                                onClick = { selectedProductForConfirm = product },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Text(
                                        text = product.name,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    if (product.productCode != null) {
                                        Text(
                                            text = "Артикул: ${product.productCode}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    if (product.supplier != null) {
                                        Text(
                                            text = "Постачальник: ${product.supplier}",
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
    selectedProductForConfirm?.let { product ->
        AlertDialog(
            onDismissRequest = { selectedProductForConfirm = null },
            title = { Text("Підтвердження") },
            text = {
                Column {
                    Text("Призначити штрих-код \"$barcode\" товару:")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold
                    )
                    if (product.productCode != null) {
                        Text("Артикул: ${product.productCode}")
                    }
                    if (product.supplier != null) {
                        Text("Постачальник: ${product.supplier}")
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onAssign(product.id)
                        selectedProductForConfirm = null
                    }
                ) {
                    Text("Підтвердити")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedProductForConfirm = null }) {
                    Text("Скасувати")
                }
            }
        )
    }
}

