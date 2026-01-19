package com.chipzone.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.chipzone.ui.viewmodels.SettingsViewModel

@Composable
fun ConnectionIndicator(
    viewModel: SettingsViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val serverRunning by viewModel.serverRunning.collectAsState(initial = false)
    
    Icon(
        imageVector = if (serverRunning) Icons.Default.CheckCircle else Icons.Default.Error,
        contentDescription = if (serverRunning) "Сервер увімкнено" else "Сервер вимкнено",
        modifier = Modifier.size(20.dp),
        tint = if (serverRunning) 
            MaterialTheme.colorScheme.onPrimary 
        else 
            MaterialTheme.colorScheme.error
    )
}

