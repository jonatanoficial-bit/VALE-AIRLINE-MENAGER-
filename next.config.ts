import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'VALE-AIRLINE-MENAGER';
const githubBasePath = `/${repositoryName}`;

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: 'export',
      basePath: githubBasePath,
      assetPrefix: githubBasePath,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
