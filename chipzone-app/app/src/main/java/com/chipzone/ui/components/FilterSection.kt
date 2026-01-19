package com.chipzone.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chipzone.ui.components.getStatusLabel
import com.chipzone.ui.components.getStatusColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterSection(
    statuses: List<String>,
    selectedStatus: String?,
    onStatusSelected: (String?) -> Unit,
    executors: List<String>,
    selectedExecutor: String?,
    onExecutorSelected: (String?) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Status Filters
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 4.dp)
        ) {
            item {
                FilterChip(
                    selected = selectedStatus == null,
                    onClick = { onStatusSelected(null) },
                    label = { Text("Всі статуси") },
                    leadingIcon = if (selectedStatus == null) {
                        { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                    } else null
                )
            }
            items(statuses) { status ->
                val isSelected = selectedStatus == status
                FilterChip(
                    selected = isSelected,
                    onClick = { onStatusSelected(if (isSelected) null else status) },
                    label = { Text(getStatusLabel(status)) }, // Reusing the helper from RepairCard (needs public access or duplication)
                    leadingIcon = if (isSelected) {
                        { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                    } else null,
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = getStatusColor(status).copy(alpha = 0.2f),
                        selectedLabelColor = getStatusColor(status),
                        selectedLeadingIconColor = getStatusColor(status)
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        selectedBorderColor = getStatusColor(status),
                        selectedBorderWidth = 1.dp
                    )
                )
            }
        }

        // Executor Filters
        if (executors.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 4.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedExecutor == null,
                        onClick = { onExecutorSelected(null) },
                        label = { Text("Всі виконавці") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp)) }
                    )
                }
                items(executors) { executor ->
                    val isSelected = selectedExecutor == executor
                    FilterChip(
                        selected = isSelected,
                        onClick = { onExecutorSelected(if (isSelected) null else executor) },
                        label = { Text(executor) },
                        leadingIcon = if (isSelected) {
                            { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                        } else null
                    )
                }
            }
        }
    }
}
