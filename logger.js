// Logger utility to add timestamps to console logs

// Store original console methods
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// Get current timestamp
function getTimestamp() {
    return new Date().toISOString();
}

// Override console methods
console.log = function() {
    const args = Array.from(arguments);
    args.unshift(`[${getTimestamp()}]`);
    originalConsole.log.apply(console, args);
};

console.warn = function() {
    const args = Array.from(arguments);
    args.unshift(`[${getTimestamp()}] WARN:`);
    originalConsole.warn.apply(console, args);
};

console.error = function() {
    const args = Array.from(arguments);
    args.unshift(`[${getTimestamp()}] ERROR:`);
    originalConsole.error.apply(console, args);
};

console.info = function() {
    const args = Array.from(arguments);
    args.unshift(`[${getTimestamp()}] INFO:`);
    originalConsole.info.apply(console, args);
};

console.debug = function() {
    const args = Array.from(arguments);
    args.unshift(`[${getTimestamp()}] DEBUG:`);
    originalConsole.debug.apply(console, args);
};
