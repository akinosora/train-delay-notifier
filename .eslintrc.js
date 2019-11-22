module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:prettier/recommended'
    ],
    plugins: [
        '@typescript-eslint',
        'prettier',
        'googleappsscript'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json'
    },
    rules: {
        'prettier/prettier': [
            'error',
        ],
    },
    env: {
      "googleappsscript/googleappsscript": true
    }
}
