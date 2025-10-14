/**
 * @fileoverview src/hooks/useConfig.ts
 * Hook to fetch public configuration from the server
 */

"use client";

import { useState, useEffect } from "react";

interface Config {
    enableAttachments: boolean;
}

let cachedConfig: Config | null = null;

export function useConfig() {
    const [config, setConfig] = useState<Config | null>(cachedConfig);
    const [loading, setLoading] = useState(!cachedConfig);

    useEffect(() => {
        if (cachedConfig) {
            setConfig(cachedConfig);
            setLoading(false);
            return;
        }

        fetch("/api/config")
            .then(res => res.json())
            .then((data: Config) => {
                cachedConfig = data;
                setConfig(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Failed to fetch config:", error);
                // Default to attachments enabled if fetch fails
                const defaultConfig = { enableAttachments: true };
                cachedConfig = defaultConfig;
                setConfig(defaultConfig);
                setLoading(false);
            });
    }, []);

    return { config, loading };
}
