export namespace PreciseTrigger {
    interface ExecutorCache {
        get(key: string, defaultValue?: number | boolean): number | boolean

        put(key: string, value: number | boolean, expirationInSeconds?: number): void

        remove(key: string): void;
    }
}
