/**
 * Memory leak debugging utility for DarkReader
 * Call DARKREADER_DUMP() in console to log cache sizes
 */

import {LRUCache} from '../../utils/lru-cache';

interface CacheStats {
    name: string;
    size: number;
    type: 'Map' | 'Set' | 'Array' | 'LRUCache';
    details?: string;
}

// References to caches we want to monitor
let cacheReferences: Record<string, Map<any, any> | Set<any> | any[] | LRUCache<any, any>> = {};

export function registerCache(name: string, cache: Map<any, any> | Set<any> | any[] | LRUCache<any, any>): void {
    cacheReferences[name] = cache;
}

function getCacheStats(): CacheStats[] {
    const stats: CacheStats[] = [];

    for (const [name, cache] of Object.entries(cacheReferences)) {
        if (cache instanceof Map) {
            let nestedSize = 0;
            let details = '';

            // Check for nested Maps or LRUCaches (like inlineStringValueCache)
            cache.forEach((value) => {
                if (value instanceof Map) {
                    nestedSize += value.size;
                } else if (value instanceof LRUCache) {
                    nestedSize += value.size;
                }
            });

            if (nestedSize > 0) {
                details = `${cache.size} outer keys, ${nestedSize} total nested entries`;
            }

            stats.push({
                name,
                size: cache.size,
                type: 'Map',
                details: details || undefined,
            });
        } else if (cache instanceof Set) {
            stats.push({
                name,
                size: cache.size,
                type: 'Set',
            });
        } else if (Array.isArray(cache)) {
            stats.push({
                name,
                size: cache.length,
                type: 'Array',
            });
        } else if (cache instanceof LRUCache) {
            stats.push({
                name,
                size: cache.size,
                type: 'LRUCache',
            });
        }
    }

    return stats;
}

function logCacheStats(): void {
    const stats = getCacheStats();
    const total = stats.reduce((sum, s) => sum + s.size, 0);

    console.group('%c[DarkReader] Cache Stats', 'color: #ff6b6b; font-weight: bold;');
    console.log(`Total cache entries: ${total}`);
    console.table(stats.map(s => ({
        Name: s.name,
        Size: s.size,
        Type: s.type,
        Details: s.details || '-',
    })));
    console.groupEnd();
}

// Expose DARKREADER_DUMP as a global command
declare global {
    interface Window {
        DARKREADER_DUMP?: () => void;
    }
}

export function initLeakDebug(): void {
    if (typeof window !== 'undefined') {
        window.DARKREADER_DUMP = () => {
            logCacheStats();
        };
    }
}

export function stopLeakDebug(): void {
    if (typeof window !== 'undefined') {
        delete window.DARKREADER_DUMP;
    }
}
