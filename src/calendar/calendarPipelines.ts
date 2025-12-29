import { Notice } from "obsidian";
import type { CalendarHelperService, CalendarID, CalendarMeta, CalendarStatus, DataService, FetchService, HelperService, ISODate, NormalizedEvent } from "../plugin/types";
import { get } from "svelte/store";

export interface CalendarServiceDeps {
    data: DataService;
    fetch: FetchService;
    helpers: HelperService;
    calHelpers: CalendarHelperService;
}

export class CalendarPipeline {
    // Declare properties to hold injected dependencies
    private data: DataService;
    private fetch: FetchService;
    private helpers: HelperService;
    private calHelpers: CalendarHelperService;

    // Inject dependencies via constructor
    constructor(deps: CalendarServiceDeps) {
        this.data = deps.data;
        this.fetch = deps.fetch;
        this.helpers = deps.helpers;
        this.calHelpers = deps.calHelpers;
    }

    /** Helper to access calendar status. */
    private setCalendarStatus(status: CalendarStatus) {
        this.data.calendarState.set({ status })
    }

    private setCalendarError(error: string) {
        this.data.calendarState.set({ status: "error", lastError: error })
    }

    private getCalendarStatus(): CalendarStatus {
        return get(this.data.calendarState).status;
    }

    /** Write into calendarCells (store) with index and eventsById. */    
    private populateCells(id: CalendarID, index: Record<string, string[]>, eventsById: Record<string, NormalizedEvent>) {
        Object.keys(index).forEach(date => {
            const IDs = index[date];
            const events: NormalizedEvent[] = [];

            IDs.forEach(id => events.push(eventsById[id]));

            const labels = this.calHelpers.getEventLabels(events);
            this.data.setCell(date, id, labels);
        })
    }

    public async fetchInGracePeriod(tDate: ISODate, id: CalendarID, after: Date, before: Date) {
        // Check if we should fetch. If we do fetch, set status.
        if (this.getCalendarStatus() === "fetching") return;
        this.setCalendarStatus("fetching");

        // [SETUP] fetchToken for GUARD later
        this.data.fetchToken.update(token => token + 1);
        const myToken = get(this.data.fetchToken);

        // [SETUP] calendar meta
        const calendar = get(this.data.templates)[tDate][id] as CalendarMeta;

        // [SETUP] startUrl for GUARD later
        const startUrl = calendar.url;

        try { // Wrap in try because fetchFromUrl throws Exception
            const response = await this.fetch.fetchFromUrl(calendar.url, calendar.etag, calendar.lastModified); 	

            // [STORE] Update lastFetched status in store
            this.data.updateItemMeta(tDate, id, { lastFetched: Date.now() })

            // [GUARD] If a new refresh token is generated, that means our fetch is stale (old data). We want to drop that.
            if (myToken !== get(this.data.fetchToken)) {
                console.warn("Fetch request is stale. Aborted.");
                this.setCalendarStatus("unchanged");
                return;
            };

            // [GUARD] If the old URL is different from the current one, the URL changed and we should drop the fetch
            if (startUrl !== calendar.url) { // We can do this because calendar is a reference to the object
                new Notice("URL changed during fetch. Please fetch again.");
                console.warn("URL changed during fetch. Aborted.");
                this.setCalendarStatus("unchanged");
                return;
            };

            // [PARSE] Parse the ICS within the grace period
            const events = this.calHelpers.parseICSBetween(response.text, calendar.id, after, before);

            // [CONDITION] If the calendar contents didn't change, don't bother updating freeze and cache.
            const contentHash = await this.helpers.hashText(JSON.stringify(events));
            if (!this.fetch.detectFetchChange(response, contentHash, calendar.contentHash)) {
                this.setCalendarStatus("unchanged");
                return;
            }
            
            // [STORE] Update cache information 
            this.data.updateItemMeta(tDate, calendar.id, { contentHash })
            
            // [STORE] Build efficient event dictionaries and use those to write into store
            const { index, eventsById } = this.calHelpers.buildEventDictionaries(events);
            this.populateCells(calendar.id, index, eventsById);

            this.setCalendarStatus("updated");
            
        } catch (error) {
            this.setCalendarError(error);
            new Notice("An error occured while fetching. See console for details");
            console.error("An error occured while fetching:", error.message)
        }
    }
}
