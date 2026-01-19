package com.servicecenter.ui.components

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
import com.servicecenter.ui.screens.settings.SettingsViewModel
import kotlinx.coroutines.delay

@Composable
fun ConnectionIndicator(
    viewModel: SettingsViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val isConnected by viewModel.isConnected.collectAsState(initial = false)
    val isChecking by viewModel.isChecking.collectAsState(initial = false)
    
    // Periodically check connection
    LaunchedEffect(Unit) {
        while (true) {
            viewModel.checkConnection()
            delay(5000) // Check every 5 seconds
        }
    }
    
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isChecking) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp
            )
        } else {
            Icon(
                imageVector = if (isConnected) Icons.Default.CheckCircle else Icons.Default.Error,
                contentDescription = if (isConnected) "Підключено" else "Не підключено",
                modifier = Modifier.size(16.dp),
                tint = if (isConnected) 
                    MaterialTheme.colorScheme.primary 
                else 
                    MaterialTheme.colorScheme.error
            )
        }
    }
}


