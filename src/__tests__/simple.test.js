// Basit test dosyası - CI/CD pipeline testi için
describe('Basit Testler', () => {
  test('matematik işlemleri', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
    expect(8 / 2).toBe(4);
  });

  test('string işlemleri', () => {
    expect('kelebek'.toUpperCase()).toBe('KELEBEK');
    expect('sinav'.length).toBe(5);
    expect('sistem'.includes('tem')).toBe(true);
  });

  test('array işlemleri', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.includes(3)).toBe(true);
    expect(arr.filter(x => x > 3)).toEqual([4, 5]);
  });

  test('object işlemleri', () => {
    const obj = { name: 'Kelebek', version: '2.0' };
    expect(obj.name).toBe('Kelebek');
    expect(obj.version).toBe('2.0');
    expect(Object.keys(obj)).toEqual(['name', 'version']);
  });
});
