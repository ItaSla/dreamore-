# DREAMORE+

Ecossistema ético para desenvolvedores de jogos independentes, 100% livre de IA generativa em arte e áudio, com Firebase Firestore + Auth, feed comunitário, grupos colaborativos e demo jogável no navegador.

## Publicação no GitHub Pages

O projeto já inclui integração pronta para o **GitHub Pages** via GitHub Actions:

1. Faça push da branch `main` para o repositório no GitHub (`ItaSla/dreamore-plus`).
2. No GitHub, acesse **Settings → Pages → Build and deployment** e selecione **Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy-pages.yml` executa `npm run build:pages` e publica automaticamente a pasta `dist/` com:
   - `index.html`, `404.html` e `.nojekyll`
   - Caminhos relativos compatíveis com subdiretórios (`https://<usuario>.github.io/<repositorio>/`)
   - Fallback automático em modo estático (`localStorage`) + sincronização via Firebase Firestore/Auth quando não há servidor Node/Express ativo
4. **Login Google no GitHub Pages**: no Firebase Console (**Authentication → Settings → Authorized domains**), adicione o domínio `<seu-usuario>.github.io` para liberar o `signInWithPopup` em produção.

## Desenvolvimento Local

```bash
npm install
npm run build
npm start
```

Acesse `http://localhost:3000`.
