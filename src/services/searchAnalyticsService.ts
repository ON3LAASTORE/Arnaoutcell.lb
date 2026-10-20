/**
 * Search Analytics & User Intent Tracking Service
 * Tracks user search queries, intent patterns, click-through sources, and frequency metrics.
 * Logs to console with structured intent analysis and persists records to local mock storage.
 */

export type SearchSource =
  | 'desktop_input_submit'
  | 'mobile_input_submit'
  | 'trending_term_click'
  | 'category_suggestion_click'
  | 'product_suggestion_click';

export type UserIntentPattern =
  | 'flagship_smartphones'
  | 'charging_and_power'
  | 'wearables_and_audio'
  | 'laptops_and_computing'
  | 'brand_exploration'
  | 'budget_electronics'
  | 'store_services'
  | 'general_discovery';

export interface SearchAnalyticsEvent {
  id: string;
  term: string;
  normalizedTerm: string;
  timestamp: string;
  source: SearchSource;
  intentPattern: UserIntentPattern;
  categoryMatchesCount: number;
  productMatchesCount: number;
  hasResults: boolean;
  selectedEntityTitle?: string;
}

export interface SearchIntentDistribution {
  intent: UserIntentPattern;
  count: number;
  percentage: number;
}

export interface PopularTermStat {
  term: string;
  count: number;
  lastSearchedAt: string;
  primaryIntent: UserIntentPattern;
  hasResults: boolean;
}

export interface SearchAnalyticsSummary {
  totalSearches: number;
  uniqueTermsCount: number;
  topTerms: PopularTermStat[];
  intentDistribution: SearchIntentDistribution[];
  recentEvents: SearchAnalyticsEvent[];
}

const STORAGE_KEY = 'arnaout_search_analytics_v1';
const MAX_STORED_EVENTS = 200;

/**
 * Pure heuristic function to classify user search intent from query tokens
 */
export function classifyUserIntent(term: string): UserIntentPattern {
  const t = term.toLowerCase().trim();

  if (!t) return 'general_discovery';

  // Wearables & audio (prioritized over general galaxy/ultra keywords)
  if (
    /watch|buds|airpods|headphone|earphone|audio|speaker|sound|سماعة|سماعات|ساعة|بلوتوث/i.test(
      t
    )
  ) {
    return 'wearables_and_audio';
  }

  // Laptops, tablets & computing
  if (
    /macbook|laptop|ipad|tablet|screen|keyboard|mouse|كمبيوتر|لابتوب|ايباد/i.test(
      t
    )
  ) {
    return 'laptops_and_computing';
  }

  // Charging, power banks, cables
  if (
    /charge|charger|power|bank|cable|adapter|watt|gan|usb|type-c|lightning|magsafe|بطارية|شاحن|شواحن|كيبل|بور/i.test(t)
  ) {
    return 'charging_and_power';
  }

  // Smartphones & flagship phones
  if (
    /iphone|apple|samsung|galaxy|ultra|pro max|pixel|xiaomi|redmi|honor|poco|doogee|هاتف|تلفون|موبايل|ايفون|سامسونج/i.test(
      t
    )
  ) {
    return 'flagship_smartphones';
  }

  // Brand inquiries
  if (
    /anker|acefast|foneng|yesido|lito|hoco|porodo|apple|samsung|sony|jbl/i.test(
      t
    )
  ) {
    return 'brand_exploration';
  }

  // Store services & money transfer
  if (/omt|whish|western|touch|alfa|maintenance|repair|صيانة|تحويل|خدمات/i.test(t)) {
    return 'store_services';
  }

  // Budget deals or cheap
  if (/cheap|budget|discount|offer|deal|sale|خصم|عروض|رخيص/i.test(t)) {
    return 'budget_electronics';
  }

  return 'general_discovery';
}

/**
 * Normalizes term for aggregation (lowercased, trimmed, trimmed punctuation)
 */
export function normalizeAnalyticsTerm(rawTerm: string): string {
  return rawTerm
    .toLowerCase()
    .trim()
    .replace(/[؟?.,!#%&*()+=\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * In-memory fallback if localStorage is unavailable
 */
export const INITIAL_DEMO_SEARCH_EVENTS: SearchAnalyticsEvent[] = [
  {
    id: 'srch_init_1',
    term: 'iPhone 16 Pro Max',
    normalizedTerm: 'iphone 16 pro max',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    source: 'desktop_input_submit',
    intentPattern: 'flagship_smartphones',
    categoryMatchesCount: 1,
    productMatchesCount: 3,
    hasResults: true,
  },
  {
    id: 'srch_init_2',
    term: 'Anker 737 Power Bank',
    normalizedTerm: 'anker 737 power bank',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    source: 'trending_term_click',
    intentPattern: 'charging_and_power',
    categoryMatchesCount: 1,
    productMatchesCount: 2,
    hasResults: true,
  },
  {
    id: 'srch_init_3',
    term: 'Samsung Galaxy S25 Ultra',
    normalizedTerm: 'samsung galaxy s25 ultra',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    source: 'desktop_input_submit',
    intentPattern: 'flagship_smartphones',
    categoryMatchesCount: 1,
    productMatchesCount: 2,
    hasResults: true,
  },
  {
    id: 'srch_init_4',
    term: 'شاحن سريع GaN',
    normalizedTerm: 'شاحن سريع gan',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    source: 'mobile_input_submit',
    intentPattern: 'charging_and_power',
    categoryMatchesCount: 1,
    productMatchesCount: 3,
    hasResults: true,
  },
  {
    id: 'srch_init_5',
    term: 'AirPods Pro 2 USB-C',
    normalizedTerm: 'airpods pro 2 usb-c',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    source: 'product_suggestion_click',
    intentPattern: 'wearables_and_audio',
    categoryMatchesCount: 1,
    productMatchesCount: 1,
    hasResults: true,
  },
  {
    id: 'srch_init_6',
    term: 'MacBook Pro M4',
    normalizedTerm: 'macbook pro m4',
    timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
    source: 'desktop_input_submit',
    intentPattern: 'laptops_and_computing',
    categoryMatchesCount: 1,
    productMatchesCount: 1,
    hasResults: true,
  },
  {
    id: 'srch_init_7',
    term: 'iPhone 16 Pro',
    normalizedTerm: 'iphone 16 pro',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    source: 'trending_term_click',
    intentPattern: 'flagship_smartphones',
    categoryMatchesCount: 1,
    productMatchesCount: 2,
    hasResults: true,
  },
  {
    id: 'srch_init_8',
    term: 'OMT تحويل',
    normalizedTerm: 'omt تحويل',
    timestamp: new Date(Date.now() - 3600000 * 9).toISOString(),
    source: 'desktop_input_submit',
    intentPattern: 'store_services',
    categoryMatchesCount: 1,
    productMatchesCount: 0,
    hasResults: true,
  },
];

let inMemoryEvents: SearchAnalyticsEvent[] = [...INITIAL_DEMO_SEARCH_EVENTS];

/**
 * Retrieve raw search analytics events
 */
export function getStoredSearchEvents(): SearchAnalyticsEvent[] {
  if (typeof window === 'undefined') {
    return inMemoryEvents;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_SEARCH_EVENTS));
      return INITIAL_DEMO_SEARCH_EVENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_SEARCH_EVENTS;
  } catch {
    return inMemoryEvents;
  }
}

/**
 * Persist search analytics events
 */
export function saveSearchEvents(events: SearchAnalyticsEvent[]): void {
  const trimmed = events.slice(0, MAX_STORED_EVENTS);
  inMemoryEvents = trimmed;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Mock API endpoint that tracks a search event and logs formatted analytics to console
 */
export async function trackSearchQuery(params: {
  term: string;
  source: SearchSource;
  categoryMatchesCount?: number;
  productMatchesCount?: number;
  selectedEntityTitle?: string;
}): Promise<SearchAnalyticsEvent | null> {
  const cleanTerm = params.term?.trim();
  if (!cleanTerm) return null;

  const normalized = normalizeAnalyticsTerm(cleanTerm);
  const intent = classifyUserIntent(normalized);
  const catCount = params.categoryMatchesCount ?? 0;
  const prodCount = params.productMatchesCount ?? 0;
  const hasResults = catCount + prodCount > 0 || !!params.selectedEntityTitle;

  const event: SearchAnalyticsEvent = {
    id: `srch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    term: cleanTerm,
    normalizedTerm: normalized,
    timestamp: new Date().toISOString(),
    source: params.source,
    intentPattern: intent,
    categoryMatchesCount: catCount,
    productMatchesCount: prodCount,
    hasResults,
    selectedEntityTitle: params.selectedEntityTitle,
  };

  // Structured console log for analyzing user intent patterns
  if (typeof console !== 'undefined' && console.log) {
    console.log(
      `%c[Search Analytics]%c Query: "${cleanTerm}" | Intent: %c[${intent}]%c | Source: ${params.source} | Results: ${catCount} categories, ${prodCount} products`,
      'color: #007AFF; font-weight: bold;',
      'color: inherit;',
      'color: #16A34A; font-weight: bold;',
      'color: inherit;'
    );
    console.info('[Search Analytics Metadata]', {
      term: cleanTerm,
      normalizedTerm: normalized,
      intentPattern: intent,
      source: params.source,
      matches: { categories: catCount, products: prodCount },
      timestamp: event.timestamp,
      selectedEntity: params.selectedEntityTitle || null,
    });
  }

  // Persist to store
  const existing = getStoredSearchEvents();
  const updated = [event, ...existing];
  saveSearchEvents(updated);

  // Sync to Firestore in background
  if (typeof window !== 'undefined') {
    import('../firebase').then(({ db }) => {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'search_analytics', event.id), event).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }

  // Simulate mock API resolution
  return event;
}

/**
 * Aggregates search events into a summary of popular terms, intent distribution, and metrics
 */
export function computeSearchAnalyticsSummary(
  events: SearchAnalyticsEvent[],
  topLimit = 10
): SearchAnalyticsSummary {
  const totalSearches = events.length;
  if (totalSearches === 0) {
    return {
      totalSearches: 0,
      uniqueTermsCount: 0,
      topTerms: [],
      intentDistribution: [],
      recentEvents: [],
    };
  }

  // Count frequencies by normalized term
  const termMap = new Map<
    string,
    {
      displayTerm: string;
      count: number;
      lastSearchedAt: string;
      intent: UserIntentPattern;
      hasResults: boolean;
    }
  >();

  const intentMap = new Map<UserIntentPattern, number>();

  for (const ev of events) {
    // Term aggregation
    const existing = termMap.get(ev.normalizedTerm);
    if (!existing) {
      termMap.set(ev.normalizedTerm, {
        displayTerm: ev.term,
        count: 1,
        lastSearchedAt: ev.timestamp,
        intent: ev.intentPattern,
        hasResults: ev.hasResults,
      });
    } else {
      existing.count += 1;
      if (new Date(ev.timestamp) > new Date(existing.lastSearchedAt)) {
        existing.lastSearchedAt = ev.timestamp;
      }
    }

    // Intent aggregation
    intentMap.set(ev.intentPattern, (intentMap.get(ev.intentPattern) || 0) + 1);
  }

  // Sort top terms
  const topTerms: PopularTermStat[] = Array.from(termMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topLimit)
    .map((item) => ({
      term: item.displayTerm,
      count: item.count,
      lastSearchedAt: item.lastSearchedAt,
      primaryIntent: item.intent,
      hasResults: item.hasResults,
    }));

  // Intent distribution
  const intentDistribution: SearchIntentDistribution[] = Array.from(intentMap.entries())
    .map(([intent, count]) => ({
      intent,
      count,
      percentage: Math.round((count / totalSearches) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSearches,
    uniqueTermsCount: termMap.size,
    topTerms,
    intentDistribution,
    recentEvents: events.slice(0, 20),
  };
}

/**
 * Convenience getter for summary of current search events
 */
export function getSearchAnalyticsSummary(topLimit = 10): SearchAnalyticsSummary {
  return computeSearchAnalyticsSummary(getStoredSearchEvents(), topLimit);
}

/**
 * Resets search analytics store (useful for tests or admin maintenance)
 */
export function clearSearchAnalytics(): void {
  inMemoryEvents = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
