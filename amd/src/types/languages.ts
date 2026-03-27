// types/languages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for supported video-lecture languages.
// To add a new language: append one object to SUPPORTED_LANGUAGES below.
// No other file needs to change.
// ─────────────────────────────────────────────────────────────────────────────

export interface LanguageOption {
    /** BCP-47 language code sent to the backend */
    value: string;
    /** Display label shown in the UI */
    label: string;
}

/**
 * Ordered list of languages available in the Video Lecture modal.
 * Add new entries here to expose them to users – nothing else needs updating.
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { value: 'en', label: 'English'  },
    { value: 'hi', label: 'Hindi'    },
    { value: 'mr', label: 'Marathi'  },
    { value: 'kn', label: 'Kannada'  },
    { value: 'ta', label: 'Tamil'    },
    { value: 'si', label: 'Sinhala'  },
];

/** Union type derived automatically from the config — stays in sync always. */
export type Language = typeof SUPPORTED_LANGUAGES[number]['value'];
