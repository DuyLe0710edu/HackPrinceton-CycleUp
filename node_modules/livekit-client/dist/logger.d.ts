export declare enum LogLevel {
    trace = 0,
    debug = 1,
    info = 2,
    warn = 3,
    error = 4,
    silent = 5
}
declare type LogLevelString = keyof typeof LogLevel;
declare type StructuredLogger = {
    trace: (msg: string, context?: object) => void;
    debug: (msg: string, context?: object) => void;
    info: (msg: string, context?: object) => void;
    warn: (msg: string, context?: object) => void;
    error: (msg: string, context?: object) => void;
};
declare const _default: StructuredLogger;
export default _default;
export declare function setLogLevel(level: LogLevel | LogLevelString): void;
export declare type LogExtension = (level: LogLevel, msg: string, context?: object) => void;
/**
 * use this to hook into the logging function to allow sending internal livekit logs to third party services
 * if set, the browser logs will lose their stacktrace information (see https://github.com/pimterry/loglevel#writing-plugins)
 */
export declare function setLogExtension(extension: LogExtension): void;
//# sourceMappingURL=logger.d.ts.map