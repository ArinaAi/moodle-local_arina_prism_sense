/**
 * Tiny typed event bus for credit balance refresh.
 * Producers call emitBalanceRefresh(); consumers listen with the hook.
 */

export const BALANCE_REFRESH_EVENT = 'creditBalanceChanged';

export const emitBalanceRefresh = (): void => {
    globalThis.dispatchEvent(new CustomEvent(BALANCE_REFRESH_EVENT));
};
