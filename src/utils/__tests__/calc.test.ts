import { evaluateExpression, hasOperator } from '../calc';

describe('evaluateExpression', () => {
    it.each([
        ['250', 250],
        ['12.5', 12.5],
        ['.5', 0.5],
        ['1,000', 1000],
        ['1,000 + 500', 1500],
        ['12+3*2', 18],
        ['10-4/2', 8],
        ['10/4', 2.5],
        ['6×2÷3', 4],
        ['-5+10', 5],
        ['5*-2', -10],
        ['0.1+0.2', 0.3],
        ['10/3', 3.33],
    ])('evaluates %p to %p', (input, expected) => {
        expect(evaluateExpression(input)).toBe(expected);
    });

    it('ignores trailing operators while the user is still typing', () => {
        expect(evaluateExpression('12+')).toBe(12);
        expect(evaluateExpression('12+3*')).toBe(15);
    });

    it.each(['', '   ', '-', 'abc', '12+abc', '1..2', '*5', '5**2', '--5'])(
        'returns null for invalid input %p',
        (input) => {
            expect(evaluateExpression(input)).toBeNull();
        }
    );

    it('returns null instead of Infinity/NaN for division by zero', () => {
        expect(evaluateExpression('5/0')).toBeNull();
        expect(evaluateExpression('1+5/0')).toBeNull();
    });
});

describe('hasOperator', () => {
    it('detects ASCII and keypad operators', () => {
        expect(hasOperator('3+4')).toBe(true);
        expect(hasOperator('3×4')).toBe(true);
        expect(hasOperator('3÷4')).toBe(true);
    });

    it('is false for plain numbers', () => {
        expect(hasOperator('1234.5')).toBe(false);
        expect(hasOperator('')).toBe(false);
    });
});
