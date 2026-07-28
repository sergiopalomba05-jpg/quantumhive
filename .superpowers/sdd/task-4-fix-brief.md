# Task 4 Fix Brief: Preserve Legacy Model-Only Chat Selection

## Finding To Fix

Reviewer found that non-`vs_2` chat misroutes existing requests because current Chat UI sends `modelId` but not `providerId`. `resolveProviderSelection({ modelId: 'gemini-2.5-pro' })` falls back to `gemini-2.5-flash` instead of resolving the model across ready providers.

## Goal

Fix provider selection so model-only legacy requests continue to work:

- `modelId: 'gemini-2.5-pro'` without `providerId` must select `gcp-vertex-ai` + `gemini-2.5-pro`.
- model-only unsupported or not-ready selections still fallback safely.
- explicit provider/model behavior from Task 2 must remain unchanged.

## Files

- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/providerRouter.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-router.test.ts`
- Append report: `.superpowers/sdd/task-4-report.md`

## Required Test

Add a failing test to `tests/provider-router.test.ts`:

```ts
it('resolves legacy model-only requests across router-ready providers', () => {
  const selection = resolveProviderSelection(
    { modelId: 'gemini-2.5-pro', message: 'pensar profundo' },
    {} as NodeJS.ProcessEnv,
  );

  assert.equal(selection.providerId, 'gcp-vertex-ai');
  assert.equal(selection.modelId, 'gemini-2.5-pro');
  assert.equal(selection.fallbackUsed, false);
});
```

## Expected Implementation

In `resolveProviderSelection`, after explicit `providerId + modelId` handling and before auto routing, add model-only handling:

```ts
if (!request.providerId && request.modelId) {
  const modelOnlyMatch = readyModels.find(({ model }) => model.id === request.modelId);
  if (modelOnlyMatch) {
    return {
      providerId: modelOnlyMatch.provider.id,
      providerName: modelOnlyMatch.provider.name,
      modelId: modelOnlyMatch.model.id,
      modelDisplayName: modelOnlyMatch.model.displayName,
      fallbackUsed: false,
      repoId: request.repoId,
    };
  }
  return defaultSelection(providers, 'El modelo elegido todavia no esta conectado.', request.repoId);
}
```

If the local variable order differs, implement equivalent logic without duplicating provider lists.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/provider-router.test.ts tests/chat-provider-selection.test.ts`
- `npm run lint`

## Commit

Commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/providerRouter.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-router.test.ts"`

Commit message: `fix: preserve model-only provider routing`

## Report Contract

Append to `.superpowers/sdd/task-4-report.md`:

- Fix status
- Files changed
- Tests run
- Commit hash
- Self-review notes

Return only status, commit hash, test summary, concerns.
