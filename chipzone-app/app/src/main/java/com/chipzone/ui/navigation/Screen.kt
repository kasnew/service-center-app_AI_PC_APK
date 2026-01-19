package com.chipzone.ui.navigation

sealed class Screen(val route: String) {
    object Pin : Screen("pin")
    object Main : Screen("main")
    object Repairs : Screen("repairs")
    object CreateRepair : Screen("create_repair")
    object RepairDetail : Screen("repair_detail/{id}") {
        fun createRoute(id: Int) = "repair_detail/$id"
    }
    object Products : Screen("products")
    object ProductDetail : Screen("product_detail/{id}") {
        fun createRoute(id: Int) = "product_detail/$id"
    }
    object Finance : Screen("finance")
    object Settings : Screen("settings")
    object ExecutorsEditor : Screen("executors_editor")
    object CounterpartiesEditor : Screen("counterparties_editor")
    object Scanner : Screen("scanner")
}

