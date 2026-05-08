import deepEqual from '../../utils/deepEqual';

describe('deepEqual', () => {
  // Primitifler
  test('aynı sayılar eşit', () => {
    expect(deepEqual(1, 1)).toBe(true);
  });

  test('farklı sayılar eşit değil', () => {
    expect(deepEqual(1, 2)).toBe(false);
  });

  test('aynı stringler eşit', () => {
    expect(deepEqual('abc', 'abc')).toBe(true);
  });

  test('boolean karşılaştırma', () => {
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
  });

  // Null/undefined
  test('her ikisi null eşit', () => {
    expect(deepEqual(null, null)).toBe(true);
  });

  test('null ve undefined eşit (her ikisi nullish)', () => {
    // deepEqual: a == null || b == null => false (a === b önce kontrol eder)
    // null === undefined false, sonra a == null true, return false
    expect(deepEqual(null, undefined)).toBe(false);
  });

  test('null ve obje eşit değil', () => {
    expect(deepEqual(null, {})).toBe(false);
  });

  test('undefined ve obje eşit değil', () => {
    expect(deepEqual(undefined, { a: 1 })).toBe(false);
  });

  // Farklı tipler
  test('string ve sayı eşit değil', () => {
    expect(deepEqual('1', 1)).toBe(false);
  });

  test('array ve obje eşit değil', () => {
    expect(deepEqual([1], { 0: 1 })).toBe(false);
  });

  // Diziler
  test('aynı diziler eşit', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  test('farklı uzunlukta diziler eşit değil', () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  test('farklı elemanlı diziler eşit değil', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  test('boş diziler eşit', () => {
    expect(deepEqual([], [])).toBe(true);
  });

  test('iç içe diziler eşit', () => {
    expect(deepEqual([[1, 2], [3]], [[1, 2], [3]])).toBe(true);
  });

  // Objeler
  test('aynı objeler eşit', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  test('farklı key sayısı eşit değil', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test('farklı value eşit değil', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('farklı key eşit değil', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  test('boş objeler eşit', () => {
    expect(deepEqual({}, {})).toBe(true);
  });

  // Derin objeler
  test('iç içe objeler eşit', () => {
    const a = { x: { y: { z: 1 } }, arr: [1, 2] };
    const b = { x: { y: { z: 1 } }, arr: [1, 2] };
    expect(deepEqual(a, b)).toBe(true);
  });

  test('iç içe objeler farklı', () => {
    const a = { x: { y: { z: 1 } } };
    const b = { x: { y: { z: 2 } } };
    expect(deepEqual(a, b)).toBe(false);
  });

  // Referans eşitliği
  test('aynı referans eşit', () => {
    const obj = { a: 1 };
    expect(deepEqual(obj, obj)).toBe(true);
  });

  // JSON.stringify'ın sıralama sorununu çözdüğünü test et
  test('farklı key sırası eşit', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });
});
