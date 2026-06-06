// Safe arithmetic expression evaluator for the amount field.
// Supports + - * / with correct precedence, decimals, commas, unary minus.
// Returns null for empty/invalid input. Never uses eval().

const OP = /[+\-*/]/;

export const hasOperator = (s: string): boolean => /[+\-*/×÷]/.test(s);

export const evaluateExpression = (input: string): number | null => {
    if (input == null) return null;
    let s = String(input)
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/');
    // Drop trailing operators (e.g. "12+")
    while (s.length && OP.test(s[s.length - 1])) s = s.slice(0, -1);
    if (s === '') return null;

    const tokens = s.match(/(\d+\.?\d*|\.\d+|[+\-*/])/g);
    if (!tokens || tokens.join('') !== s) return null;

    // Resolve numbers + unary minus into a flat list of numbers and operators
    const flat: (number | string)[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (OP.test(tk)) {
            const prev = flat[flat.length - 1];
            if (tk === '-' && (flat.length === 0 || typeof prev === 'string')) {
                const next = tokens[i + 1];
                if (next && /^[\d.]/.test(next)) { flat.push(-parseFloat(next)); i++; continue; }
                return null;
            }
            flat.push(tk);
        } else {
            flat.push(parseFloat(tk));
        }
    }

    // First pass: * and /
    const pass1: (number | string)[] = [];
    for (let i = 0; i < flat.length; i++) {
        const tk = flat[i];
        if (tk === '*' || tk === '/') {
            const a = pass1.pop();
            const b = flat[++i];
            if (typeof a !== 'number' || typeof b !== 'number') return null;
            pass1.push(tk === '*' ? a * b : (b === 0 ? NaN : a / b));
        } else {
            pass1.push(tk);
        }
    }

    // Second pass: + and -
    let result = pass1[0];
    if (typeof result !== 'number') return null;
    for (let i = 1; i < pass1.length; i += 2) {
        const op = pass1[i];
        const b = pass1[i + 1];
        if (typeof b !== 'number') return null;
        if (op === '+') result += b;
        else if (op === '-') result -= b;
        else return null;
    }

    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100; // avoid float noise
};
