# GitHub Pages Blazor WASM
This action allows you to deploy your Blazor WASM app to GitHub Pages.

## What this does
Restore, build, and publish the project, modify index.html to fit the repository, and create a .nojekyll file.

## How to use
This action has two inputs and no output.

`project-path`: Path of project (.csproj). Default is (repo name)/(repo name).csproj.

`main-repo`: Set to true only when running this action from the default GitHub Pages repository ({ID}.github.io). Default is false.

## Example Workflow
```yml
name: Deploy

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["main"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
# However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # Build job
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 8.0.x
      - name: Prepare Blazor WASM for GitHub Pages
        uses: na1307/blazor-github-pages@v1
        with:
          project-path: BluehillHomePage/BluehillHomePage.csproj
          main-repo: true
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: "_out/wwwroot/"

  # Deployment job
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```
