package com.chipzone.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chipzone.data.models.Counterparty
import com.chipzone.ui.components.ConnectionIndicator
import com.chipzone.ui.viewmodels.CounterpartiesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CounterpartiesEditorScreen(
    navController: NavController,
    viewModel: CounterpartiesViewModel = hiltViewModel()
) {
    val counterparties by viewModel.counterparties.collectAsState(initial = emptyList())
    
    var showAddDialog by remember { mutableStateOf(false) }
    var editingCounterparty by remember { mutableStateOf<Counterparty?>(null) }
    var counterpartyToDelete by remember { mutableStateOf<Counterparty?>(null) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Контрагенти")
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
                Icon(Icons.Default.Add, contentDescription = "Додати контрагента")
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
            items(counterparties) { counterparty ->
                CounterpartyCard(
                    counterparty = counterparty,
                    onEdit = { editingCounterparty = it },
                    onDelete = { counterpartyToDelete = it }
                )
            }
            
            if (counterparties.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Business,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "Немає контрагентів",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "Натисніть + щоб додати контрагента",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
    
    // Add/Edit Dialog
    if (showAddDialog || editingCounterparty != null) {
        CounterpartyDialog(
            counterparty = editingCounterparty,
            onDismiss = {
                showAddDialog = false
                editingCounterparty = null
            },
            onSave = { name, smartImport ->
                if (editingCounterparty != null) {
                    viewModel.updateCounterparty(
                        editingCounterparty!!.copy(
                            name = name,
                            smartImport = smartImport
                        )
                    )
                } else {
                    viewModel.addCounterparty(name, smartImport)
                }
                showAddDialog = false
                editingCounterparty = null
            }
        )
    }
    
    // Delete Confirmation Dialog
    counterpartyToDelete?.let { counterparty ->
        AlertDialog(
            onDismissRequest = { counterpartyToDelete = null },
            title = { Text("Видалити контрагента?") },
            text = { Text("Ви впевнені, що хочете видалити ${counterparty.name}?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteCounterparty(counterparty)
                        counterpartyToDelete = null
                    }
                ) {
                    Text("Видалити", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { counterpartyToDelete = null }) {
                    Text("Скасувати")
                }
            }
        )
    }
}

@Composable
fun CounterpartyCard(
    counterparty: Counterparty,
    onEdit: (Counterparty) -> Unit,
    onDelete: (Counterparty) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = counterparty.name,
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (counterparty.smartImport) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Розумний імпорт",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    } else {
                        Text(
                            text = "Стандартний імпорт",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            Row {
                IconButton(onClick = { onEdit(counterparty) }) {
                    Icon(Icons.Default.Edit, contentDescription = "Редагувати")
                }
                IconButton(onClick = { onDelete(counterparty) }) {
                    Icon(Icons.Default.Delete, contentDescription = "Видалити", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
fun CounterpartyDialog(
    counterparty: Counterparty?,
    onDismiss: () -> Unit,
    onSave: (String, Boolean) -> Unit
) {
    var name by remember { mutableStateOf(counterparty?.name ?: "") }
    var smartImport by remember { mutableStateOf(counterparty?.smartImport ?: false) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (counterparty == null) "Додати контрагента" else "Редагувати контрагента") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { 
                        name = if (it.isNotEmpty()) {
                            it.replaceFirstChar { char -> if (char.isLowerCase()) char.titlecase() else char.toString() }
                        } else {
                            it
                        }
                    },
                    label = { Text("Назва контрагента") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Розумний імпорт",
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Text(
                            text = "Автоматичний імпорт з накладної",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = smartImport,
                        onCheckedChange = { smartImport = it }
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isNotBlank()) {
                        onSave(name, smartImport)
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

