package com.servicecenter.ui.screens.transactions

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servicecenter.data.models.Transaction
import com.servicecenter.ui.components.ConnectionIndicator
import com.servicecenter.ui.screens.settings.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    onBack: () -> Unit,
    viewModel: TransactionsViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val transactions by viewModel.transactions.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val availableCategories by viewModel.availableCategories.collectAsState()
    val balances by viewModel.balances.collectAsState()
    var showCategoryFilter by remember { mutableStateOf(false) }
    val isConnected by settingsViewModel.isConnected.collectAsState(initial = false)
    
    LaunchedEffect(Unit) {
        settingsViewModel.checkConnection()
        viewModel.loadTransactions()
        viewModel.loadBalances()
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
                                text = "Транзакції",
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ConnectionIndicator()
                            IconButton(
                                onClick = { 
                                    if (isConnected) {
                                        viewModel.loadTransactions()
                                        viewModel.loadBalances()
                                    }
                                },
                                enabled = !isLoading && isConnected
                            ) {
                                if (isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(Icons.Default.Sync, contentDescription = "Синхронізувати")
                                }
                            }
                        }
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
                // Balances and filter row
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = androidx.compose.ui.graphics.Color.White
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Balances
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.AccountBalanceWallet,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = formatAmount(balances.first),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.CreditCard,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.secondary
                                )
                                Text(
                                    text = formatAmount(balances.second),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }
                        
                        // Category filter dropdown
                        if (availableCategories.isNotEmpty()) {
                            CategoryFilterDropdown(
                                categories = availableCategories,
                                selectedCategory = selectedCategory,
                                onCategorySelected = { category ->
                                    viewModel.setSelectedCategory(category)
                                },
                                onClearFilter = {
                                    viewModel.setSelectedCategory(null)
                                }
                            )
                        }
                    }
                }
                
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(transactions) { transaction ->
                        TransactionCard(transaction = transaction)
                    }
                    
                    if (transactions.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = androidx.compose.ui.Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Receipt,
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                                    )
                                    Text(
                                        text = if (selectedCategory != null) 
                                            "Немає транзакцій у цій категорії" 
                                        else 
                                            "Немає транзакцій",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryFilterDropdown(
    categories: List<String>,
    selectedCategory: String?,
    onCategorySelected: (String?) -> Unit,
    onClearFilter: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    Box {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.widthIn(min = 120.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.FilterList,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = selectedCategory ?: "Всі",
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.widthIn(max = 80.dp)
                )
                Icon(
                    Icons.Default.ArrowDropDown,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.widthIn(max = 200.dp)
        ) {
            DropdownMenuItem(
                text = { Text("Всі категорії") },
                onClick = {
                    onClearFilter()
                    expanded = false
                },
                leadingIcon = {
                    Icon(
                        Icons.Default.Clear,
                        contentDescription = null
                    )
                }
            )
            Divider()
            categories.forEach { category ->
                DropdownMenuItem(
                    text = { 
                        Text(
                            text = category,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    onClick = {
                        onCategorySelected(category)
                        expanded = false
                    },
                    trailingIcon = if (category == selectedCategory) {
                        {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    } else null
                )
            }
        }
    }
}


@Composable
fun TransactionCard(transaction: Transaction) {
    val isIncome = transaction.amount >= 0
    val categoryIcon = getCategoryIcon(transaction.category)
    var isExpanded by remember { mutableStateOf(false) }
    
    // Build description with executor name
    val fullDescription = buildString {
        append(transaction.description)
        if (transaction.executorName != null && transaction.executorName.isNotEmpty()) {
            append(" (${transaction.executorName})")
        }
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded },
        shape = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = androidx.compose.ui.graphics.Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = categoryIcon,
                        contentDescription = transaction.category,
                        tint = if (isIncome)
                            Color(0xFF4CAF50)
                        else
                            Color(0xFFF44336),
                        modifier = Modifier.size(18.dp)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    Text(
                        text = transaction.category,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                Text(
                    text = formatAmount(transaction.amount),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (isIncome)
                        Color(0xFF2E7D32)
                    else
                        Color(0xFFC62828),
                    fontWeight = FontWeight.Bold
                )
            }
            
            if (isExpanded) {
                Spacer(modifier = Modifier.height(8.dp))
                
                if (transaction.description.isNotEmpty()) {
                    Text(
                        text = fullDescription,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.DarkGray
                    )
                }
                
                if (transaction.paymentType != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Payments,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = Color.Gray
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = transaction.paymentType,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = if (transaction.dateExecuted != null) formatDate(transaction.dateExecuted) else "",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray
                )
                
                if (!isExpanded) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Докладніше",
                        modifier = Modifier.size(16.dp),
                        tint = Color.Gray.copy(alpha = 0.5f)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowUp,
                        contentDescription = "Згорнути",
                        modifier = Modifier.size(16.dp),
                        tint = Color.Gray.copy(alpha = 0.5f)
                    )
                }
            }
        }
    }
}

fun formatAmount(amount: Double): String {
    return "%.2f".format(amount).replace(",", ".") + " грн"
}

fun formatDate(dateString: String): String {
    return try {
        val date = java.time.Instant.parse(dateString)
            .atZone(java.time.ZoneId.systemDefault())
        val formatter = java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
        date.format(formatter)
    } catch (e: Exception) {
        dateString
    }
}

fun getCategoryIcon(category: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when {
        category.contains("Ремонт", ignoreCase = true) -> Icons.Default.Build
        category.contains("Продаж", ignoreCase = true) -> Icons.Default.ShoppingCart
        category.contains("Заробітня", ignoreCase = true) -> Icons.Default.AccountBalanceWallet
        category.contains("Комунальні", ignoreCase = true) -> Icons.Default.Home
        category.contains("Аренда", ignoreCase = true) -> Icons.Default.Business
        category.contains("Доставка", ignoreCase = true) -> Icons.Default.LocalShipping
        category.contains("Коригування", ignoreCase = true) -> Icons.Default.Edit
        category.contains("Списання", ignoreCase = true) -> Icons.Default.Delete
        category.contains("Дохід", ignoreCase = true) -> Icons.Default.TrendingUp
        category.contains("Витрат", ignoreCase = true) -> Icons.Default.TrendingDown
        else -> Icons.Default.Receipt
    }
}

