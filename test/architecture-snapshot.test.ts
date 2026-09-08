import { expect, test } from 'bun:test'
import { architectureSnapshot, expectArchitectureSnapshot } from './helpers/architecture-snapshot.ts'

test('native architecture snapshots ignore only a shared viewport translation', () => {
  const original = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 100 100"><rect x="10" y="20" width="100" height="100"/><g class="architecture-services"><g class="architecture-service" transform="translate(30,40)"><text>API</text></g></g><g class="architecture-edges"><path d="M 30,40 L 50,60"/></g><g class="architecture-groups"><rect x="20" y="30" width="80" height="80"/></g></svg>'
  const translated = original.replace('10 20 100 100', '8 20 100 100').replace('x="10"', 'x="8"').replace('translate(30,40)', 'translate(28,40)').replace('M 30,40 L 50,60', 'M 28,40 L 48,60').replace('x="20"', 'x="18"')
  expect(architectureSnapshot(translated)).toBe(architectureSnapshot(original))
  expect(architectureSnapshot(translated.replace('API', 'Wrong'))).not.toBe(architectureSnapshot(original))
  expect(architectureSnapshot(translated.replace('L 48,60', 'L 47,60'))).not.toBe(architectureSnapshot(original))
  expect(architectureSnapshot(translated.replace('width="80"', 'width="81"'))).not.toBe(architectureSnapshot(original))
  expectArchitectureSnapshot(translated.replace('width="80"', 'width="83.5"'), original)
  expect(() => expectArchitectureSnapshot(translated.replace('width="80"', 'width="85"'), original)).toThrow()
  expect(() => expectArchitectureSnapshot(translated.replace('L 48,60', 'L 47,60'), original)).toThrow()
  expect(() => expectArchitectureSnapshot(translated.replace('API', 'Wrong'), original)).toThrow()
})
