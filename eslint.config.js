/* eslint sort-keys: "error" */

import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'style/operator-linebreak': ['error', 'before', {
      overrides: {
        '=': 'after',
      },
    }],
    'ts/ban-ts-comment': 'off',
    'ts/method-signature-style': 'off',
    'ts/no-namespace': 'off',
    'ts/no-redeclare': 'off',
    'ts/no-unsafe-declaration-merging': 'off',
    // TypeError: context.sourceCode.isGlobalReference is not a function
    'unicorn/error-message': 'off',
  },
})
