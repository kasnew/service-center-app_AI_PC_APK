package com.chipzone.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chipzone.data.models.Executor
import com.chipzone.ui.components.ConnectionIndicator
import com.chipzone.ui.viewmodels.ExecutorsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExecutorsEditorScreen(
    navController: NavController,
    viewModel: ExecutorsViewModel = hiltViewModel()
) {
    val executors by viewModel.executors.collectAsState(initial = emptyList())
    
    var showAddDialog by remember { mutableStateOf(false) }
    var editingExecutor by remember { mutableStateOf<Executor?>(null) }
    var executorToDelete by remember { mutableStateOf<Executor?>(null) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Редактор виконавців")
                        ConnectionIndicator()
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                },
                actions = {
                    IconButton(onClick = { showAddDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Додати")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Додати виконавця")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(executors) { executor ->
                ExecutorCard(
                    executor = executor,
                    onEdit = { editingExecutor = it },
                    onDelete = { executorToDelete = it }
                )
            }
        }
    }
    
    // Add/Edit Dialog
    if (showAddDialog || editingExecutor != null) {
        ExecutorDialog(
            executor = editingExecutor,
            onDismiss = {
                showAddDialog = false
                editingExecutor = null
            },
            onSave = { name, workPercent, productPercent ->
                if (editingExecutor != null) {
                    viewModel.updateExecutor(
                        editingExecutor!!.copy(
                            name = name,
                            workPercent = workPercent,
                            productPercent = productPercent
                        )
                    )
                } else {
                    viewModel.addExecutor(name, workPercent, productPercent)
                }
                showAddDialog = false
                editingExecutor = null
            }
        )
    }
    
    // Delete Confirmation Dialog
    executorToDelete?.let { executor ->
        AlertDialog(
            onDismissRequest = { executorToDelete = null },
            title = { Text("Видалити виконавця?") },
            text = { Text("Ви впевнені, що хочете видалити ${executor.name}?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteExecutor(executor)
                        executorToDelete = null
                    }
                ) {
                    Text("Видалити", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { executorToDelete = null }) {
                    Text("Скасувати")
                }
            }
        )
    }
}

@Composable
fun ExecutorCard(
    executor: Executor,
    onEdit: (Executor) -> Unit,
    onDelete: (Executor) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = executor.name,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = "Від роботи: ${executor.workPercent.toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Від товарів: ${executor.productPercent.toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Row {
                IconButton(onClick = { onEdit(executor) }) {
                    Icon(Icons.Default.Edit, contentDescription = "Редагувати")
                }
                IconButton(onClick = { onDelete(executor) }) {
                    Icon(Icons.Default.Delete, contentDescription = "Видалити", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
fun ExecutorDialog(
    executor: Executor?,
    onDismiss: () -> Unit,
    onSave: (String, Double, Double) -> Unit
) {
    var name by remember { mutableStateOf(executor?.name ?: "") }
    var workPercent by remember { mutableStateOf(executor?.workPercent?.toString() ?: "0") }
    var productPercent by remember { mutableStateOf(executor?.productPercent?.toString() ?: "0") }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (executor == null) "Додати виконавця" else "Редагувати виконавця") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = capitalizeFirstLetter(it) },
                    label = { Text("Ім'я") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = workPercent,
                    onValueChange = { 
                        val filtered = it.filter { char -> char.isDigit() || char == '.' || char == ',' }
                        workPercent = filtered.replace(',', '.')
                    },
                    label = { Text("Відсоток від роботи") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    suffix = { Text("%") }
                )
                OutlinedTextField(
                    value = productPercent,
                    onValueChange = { 
                        val filtered = it.filter { char -> char.isDigit() || char == '.' || char == ',' }
                        productPercent = filtered.replace(',', '.')
                    },
                    label = { Text("Відсоток від товарів") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    suffix = { Text("%") }
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val work = workPercent.toDoubleOrNull() ?: 0.0
                    val product = productPercent.toDoubleOrNull() ?: 0.0
                    if (name.isNotBlank()) {
                        onSave(name, work, product)
                    }
                },
                enabled = name.isNotBlank()
            ) {
                Text("Зберегти")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Скасувати")
            }
        }
    )
}

