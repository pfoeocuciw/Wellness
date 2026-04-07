export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

export function buildApiUrl(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}

export function buildMediaUrl(url?: string | null) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE_URL}${url}`;
}

export async function readJsonSafe(res: Response) {
    const text = await res.text();

    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Сервер вернул не JSON. URL: ${res.url}, статус: ${res.status}`);
    }
}