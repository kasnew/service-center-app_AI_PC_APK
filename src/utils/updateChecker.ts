// Update checker for Service Center App
// Checks GitHub Releases for new versions

export interface ReleaseInfo {
    version: string;
    tagName: string;
    htmlUrl: string;
    publishedAt: string;
    body: string;
    assets: {
        name: string;
        downloadUrl: string;
        size: number;
    }[];
}

export interface UpdateCheckResult {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string | null;
    releaseInfo: ReleaseInfo | null;
    error: string | null;
}

// GitHub repository configuration
const GITHUB_OWNER = 'kasnew';
const GITHUB_REPO = 'service-center-app_AI_PC_APK';

/**
 * Get current app version dynamically (year.dayOfYear.minuteOfDay)
 */
export function getCurrentVersion(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const minutesSinceStartOfDay = now.getHours() * 60 + now.getMinutes();
    return `${now.getFullYear()}.${dayOfYear}.${minutesSinceStartOfDay}`;
}

/**
 * Parse version string to comparable number
 */
function parseVersion(version: string): number[] {
    // Remove 'v' prefix if present
    const cleaned = version.replace(/^v/, '');
    return cleaned.split('.').map(n => parseInt(n, 10) || 0);
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const parts1 = parseVersion(v1);
    const parts2 = parseVersion(v2);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

/**
 * Fetch latest release from GitHub
 */
export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
    try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'ServiceCenterApp'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // No releases yet
                return null;
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            version: data.tag_name.replace(/^v/, ''),
            tagName: data.tag_name,
            htmlUrl: data.html_url,
            publishedAt: data.published_at,
            body: data.body || '',
            assets: (data.assets || []).map((asset: any) => ({
                name: asset.name,
                downloadUrl: asset.browser_download_url,
                size: asset.size
            }))
        };
    } catch (error) {
        console.error('Failed to fetch latest release:', error);
        return null;
    }
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = getCurrentVersion();

    try {
        const releaseInfo = await fetchLatestRelease();

        if (!releaseInfo) {
            return {
                hasUpdate: false,
                currentVersion,
                latestVersion: null,
                releaseInfo: null,
                error: null
            };
        }

        const hasUpdate = compareVersions(releaseInfo.version, currentVersion) > 0;

        return {
            hasUpdate,
            currentVersion,
            latestVersion: releaseInfo.version,
            releaseInfo,
            error: null
        };
    } catch (error: any) {
        return {
            hasUpdate: false,
            currentVersion,
            latestVersion: null,
            releaseInfo: null,
            error: error.message || 'Unknown error'
        };
    }
}

/**
 * Get download URL for current platform
 */
export function getDownloadUrlForPlatform(releaseInfo: ReleaseInfo, platform: 'linux' | 'android'): string | null {
    const assets = releaseInfo.assets;

    if (platform === 'linux') {
        const appImage = assets.find(a => a.name.endsWith('.AppImage'));
        return appImage?.downloadUrl || null;
    }

    if (platform === 'android') {
        const apk = assets.find(a => a.name.endsWith('.apk'));
        return apk?.downloadUrl || null;
    }

    return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
