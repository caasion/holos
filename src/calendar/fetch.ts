import { requestUrl, type RequestUrlResponse } from "obsidian";

/** Using Obsidian's requestUrl(), attempt to fetch with headers.
 * Throws errors, must be handled.
 */
export async function fetchFromUrl(url: string, etag?: string, lastModified?: string): Promise<RequestUrlResponse> {
    if (!url) {
        throw new Error("No URL to fetch");
    }

    try {
        const response = await requestUrl({
            url,
            headers: {
                ...(etag ? { 'If-None-Match': etag } : {}),
                ...(lastModified ? { 'If-Modified-Since': lastModified} : {})
            }
        });

        return response;
        
    } catch (error) {
        throw error;
    }
}

/** Based on headers (response.status) and contentHash (fallback), 
 * determines if response has changed from calendarStore. */
export function detectFetchChange(response: RequestUrlResponse, contentHash: string, oldContentHash?: string): boolean {
    const contentChanged: boolean = contentHash != oldContentHash;

    if (response.status == 200 && contentChanged) {
        return true;
    } else if (response.status == 304 || !contentChanged) {
        return false;
    } 

    return false;
}

