package com.servicecenter.data.local

import androidx.datastore.preferences.core.stringPreferencesKey

object PreferencesKeys {
    val SERVER_URL = stringPreferencesKey("server_url") // For backward compatibility
    val SERVERS_LIST = stringPreferencesKey("servers_list") // JSON array of ServerConfig
    val ACTIVE_SERVER_ID = stringPreferencesKey("active_server_id") // ID of active server
}

