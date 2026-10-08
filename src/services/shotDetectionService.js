import axios from "axios";

/**
 * Service API Client untuk Fitur Deteksi Tembakan Target,
 * Analisis Citra Komputer (Computer Vision), dan WebSocket Streaming SITRAK.
 */

const getBackendBaseUrl = () => {
    return process.env.REACT_APP_BACKEND_URL || "http://172.16.8.240:1200";
};

/**
 * Mendapatkan URL lengkap untuk file gambar di backend (misal dari /storage/uploads/...)
 * @param {string} relativePath 
 * @returns {string}
 */
export const getFullImageUrl = (relativePath) => {
    if (!relativePath) return "";
    if (
        relativePath.startsWith("http://") ||
        relativePath.startsWith("https://") ||
        relativePath.startsWith("data:") ||
        relativePath.startsWith("blob:")
    ) {
        return relativePath;
    }
    const base = getBackendBaseUrl();
    const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    return `${base}${cleanPath}`;
};

/**
 * Mendapatkan URL WebSocket untuk sesi tertentu
 * @param {string|number} sessionId 
 * @returns {string}
 */
export const getShotsWebSocketUrl = (sessionId) => {
    const base = getBackendBaseUrl();
    const isHttps = base.startsWith("https");
    const wsProto = isHttps ? "wss:" : "ws:";
    const host = base.replace(/^https?:\/\//, "");
    return `${wsProto}//${host}/ws/shots?sessionId=${sessionId}`;
};

/**
 * Mengunggah file citra target tembak untuk dideteksi oleh AI backend
 * @param {string|number} sessionId 
 * @param {Object} params
 * @param {File|Blob} params.file - File gambar target
 * @param {number} [params.id_babak] - ID babak (opsional)
 * @param {number} [params.id_personel_penembak] - ID personel penembak (opsional)
 * @param {number} [params.targetCenterX] - Kalibrasi opsional titik tengah X
 * @param {number} [params.targetCenterY] - Kalibrasi opsional titik tengah Y
 * @param {number} [params.targetRadius] - Kalibrasi opsional radius target
 * @param {number} [params.darkThreshold] - Sensitivitas deteksi gelap (default 75)
 * @param {boolean} [params.mockIfEmpty] - Fallback cerdas jika citra terlalu buram
 * @param {Function} [onUploadProgress] - Callback progress upload
 * @returns {Promise<Object>}
 */
export const detectUploadShots = async (sessionId, params = {}, onUploadProgress = null) => {
    const formData = new FormData();
    if (params.file) {
        formData.append("image", params.file);
    }
    if (params.id_babak) {
        formData.append("id_babak", params.id_babak);
    }
    if (params.id_personel_penembak) {
        formData.append("id_personel_penembak", params.id_personel_penembak);
    }
    if (params.targetCenterX !== undefined) {
        formData.append("target_center_x", params.targetCenterX);
    }
    if (params.targetCenterY !== undefined) {
        formData.append("target_center_y", params.targetCenterY);
    }
    if (params.targetRadius !== undefined) {
        formData.append("target_radius", params.targetRadius);
    }
    if (params.darkThreshold !== undefined) {
        formData.append("dark_threshold", params.darkThreshold);
    }
    if (params.mockIfEmpty !== undefined) {
        formData.append("mock_if_empty", params.mockIfEmpty ? "true" : "false");
    }

    const url = `${getBackendBaseUrl()}/sessions/${sessionId}/shots/detect-upload`;

    const token = localStorage.getItem("access_token");
    const headers = {
        "Content-Type": "multipart/form-data",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await axios.post(url, formData, {
        headers,
        onUploadProgress: (progressEvent) => {
            if (onUploadProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onUploadProgress(percent);
            }
        },
    });

    return response.data;
};

/**
 * Mengirim satu frame citra kamera (base64 JPEG) untuk streaming deteksi tembakan delta
 * @param {string|number} sessionId 
 * @param {string} frameBase64 - Data URL base64 atau raw base64 JPEG
 * @param {boolean} [mockIfEmpty] - Fallback jika tidak terdeteksi
 * @returns {Promise<Object>}
 */
export const streamFrameDetection = async (sessionId, frameBase64, mockIfEmpty = false) => {
    const url = `${getBackendBaseUrl()}/sessions/${sessionId}/shots/stream-frame`;
    const token = localStorage.getItem("access_token");
    const headers = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await axios.post(
        url,
        {
            frame_base64: frameBase64,
            mock_if_empty: mockIfEmpty,
        },
        { headers }
    );

    return response.data;
};

/**
 * Mengambil riwayat tembakan yang tersimpan untuk sesi ini
 * @param {string|number} sessionId 
 * @returns {Promise<Array>}
 */
export const getShotsHistory = async (sessionId) => {
    const url = `${getBackendBaseUrl()}/sessions/${sessionId}/shots`;
    const token = localStorage.getItem("access_token");
    const headers = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await axios.get(url, { headers });
    return response.data || [];
};

/**
 * Membuat koneksi WebSocket client untuk pembaruan tembakan real-time
 * @param {string|number} sessionId 
 * @param {Object} callbacks
 * @param {Function} callbacks.onMessage - Handler saat menerima event baru
 * @param {Function} callbacks.onStatusChange - Handler status koneksi ('connecting'|'connected'|'disconnected')
 * @param {Function} callbacks.onError - Handler error
 * @returns {Object} { ws, disconnect }
 */
export const connectShotsWebSocket = (sessionId, { onMessage, onStatusChange, onError } = {}) => {
    if (!sessionId) return { ws: null, disconnect: () => {} };

    const wsUrl = getShotsWebSocketUrl(sessionId);
    let ws = null;
    let isExplicitlyClosed = false;
    let reconnectTimeout = null;

    const connect = () => {
        if (isExplicitlyClosed) return;
        if (onStatusChange) onStatusChange("connecting");

        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                if (onStatusChange) onStatusChange("connected");
                // Kirim event subscribe untuk sesi ini
                try {
                    ws.send(JSON.stringify({ action: "SUBSCRIBE", sessionId: String(sessionId) }));
                } catch (e) {
                    console.warn("Gagal mengirim subscribe payload:", e);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (onMessage) onMessage(parsed);
                } catch (e) {
                    console.error("Gagal parse pesan WebSocket:", e);
                }
            };

            ws.onerror = (err) => {
                if (onError) onError(err);
                if (onStatusChange) onStatusChange("error");
            };

            ws.onclose = () => {
                if (onStatusChange) onStatusChange("disconnected");
                // Coba reconnect setelah 4 detik jika tidak ditutup secara eksplisit
                if (!isExplicitlyClosed) {
                    reconnectTimeout = setTimeout(connect, 4000);
                }
            };
        } catch (err) {
            if (onError) onError(err);
            if (onStatusChange) onStatusChange("error");
        }
    };

    connect();

    return {
        getSocket: () => ws,
        disconnect: () => {
            isExplicitlyClosed = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                ws.close();
            }
        },
    };
};

