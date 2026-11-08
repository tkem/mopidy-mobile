import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';

/** Create a fake `ActivatedRoute` with the given route and query parameters. */
export function fakeRoute(
  params: Record<string, string> = {},
  query: Record<string, string | string[]> = {},
  parentPaths: string[] = [],
): ActivatedRoute {
  return {
    snapshot: {
      paramMap: convertToParamMap(params),
      queryParamMap: convertToParamMap(query),
      pathFromRoot: parentPaths.map((path) => ({ routeConfig: { path } })),
    },
  } as unknown as ActivatedRoute;
}

/** Create a mock Ionic `NavController`. */
export function mockNavController() {
  return {
    back: vi.fn(),
    navigateForward: vi.fn().mockResolvedValue(true),
    navigateBack: vi.fn().mockResolvedValue(true),
    navigateRoot: vi.fn().mockResolvedValue(true),
  };
}

/** Create a mock Ionic refresher event. */
export function refresherEvent() {
  return { target: { complete: vi.fn() } };
}
