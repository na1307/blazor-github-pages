import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
    {
        ignores: ['dist/**', '**/node_modules/**']
    },
    {
        files: ['**/*.ts', '**/*.cjs'],
        extends: [...tseslint.configs.recommended]
    },
    eslintConfigPrettier // Prettier와의 충돌 방지 설정. 항상 마지막에 와야 합니다.
)
