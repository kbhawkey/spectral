import { DiagnosticSeverity } from '@stoplight/types';
import { Document } from '../../../document';
import type { Spectral } from '../../../index';
import * as Parsers from '../../../parsers';
import { createWithRules } from './__helpers__/createWithRules';
import { httpAndFileResolver } from '../../../resolvers/http-and-file';

describe('unusedComponentsSchema - Local references', () => {
  let s: Spectral;

  beforeEach(async () => {
    s = await createWithRules(['oas3-unused-components-schema'], { resolver: httpAndFileResolver });
  });

  test('does not report anything for empty object', async () => {
    const results = await s.run({
      openapi: '3.0.0',
    });

    expect(results).toEqual([]);
  });

  test('does not throw when meeting an invalid json pointer', async () => {
    const doc = `{
      "openapi": "3.0.0",
      "x-hook": {
        "$ref": "'$#@!!!' What?"
      },
      "paths": {
      },
      "components": {
        "schemas": {
          "NotHooked": {
            "type": "object"
          }
        }
      }
    }`;

    const results = await s.run(doc);

    expect(results).toEqual([
      expect.objectContaining({
        code: 'invalid-ref',
        path: ['x-hook', '$ref'],
      }),
      {
        code: 'oas3-unused-components-schema',
        message: 'Potentially unused components schema has been detected.',
        path: ['components', 'schemas', 'NotHooked'],
        range: {
          end: {
            character: 28,
            line: 10,
          },
          start: {
            character: 22,
            line: 9,
          },
        },
        severity: DiagnosticSeverity.Warning,
      },
    ]);
  });

  test('does not report anything when all the components schemas are referenced', async () => {
    const doc = `{
      "openapi": "3.0.0",
      "x-hook": {
        "$ref": "#/components/schemas/Hooked"
      },
      "x-also-hook": {
        "$ref": "#/components/schemas/Hooked"
      },
      "paths": {
        "/path": {
          "post": {
            "parameters": [
              {
                "$ref": "#/components/schemas/HookedAsWell"
              }
            ]
          }
        }
      },
      "components": {
        "schemas": {
          "Hooked": {
            "type": "object"
          },
          "HookedAsWell": {
            "name": "value",
            "in": "query",
            "type": "number"
          }
        }
      }
    }`;

    const results = await s.run(new Document(doc, Parsers.Json));

    expect(results).toEqual([]);
  });

  test('reports orphaned components schemas', async () => {
    const doc = `{
      "openapi": "3.0.0",
      "paths": {
        "/path": {
          "post": {}
        }
      },
      "components": {
        "schemas": {
          "BouhouhouIamUnused": {
            "type": "object"
          }
        }
      }
    }`;

    const results = await s.run(new Document(doc, Parsers.Json));

    expect(results).toEqual([
      {
        code: 'oas3-unused-components-schema',
        message: 'Potentially unused components schema has been detected.',
        path: ['components', 'schemas', 'BouhouhouIamUnused'],
        range: {
          end: {
            character: 11,
            line: 11,
          },
          start: {
            character: 32,
            line: 9,
          },
        },
        severity: DiagnosticSeverity.Warning,
      },
    ]);
  });
});
