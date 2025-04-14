import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

// Load environment variables
dotenv.config();

// Cache configuration
const CACHE_TTL = 3600; // 1 hour in seconds
const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Store/retrieve references for better performance
});

// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

// Initialize Octokit with auth token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'github-repo-analyzer v1.0.0'
});

/**
 * Parse GitHub repository information from various input formats
 * @param {string} input - Repository input (URL or owner/repo)
 * @returns {Object} Parsed repository information
 * @throws {Error} If input format is invalid
 */
export function parseRepositoryInput(input) {
  // Remove trailing slashes and whitespace
  input = input.trim().replace(/\/+$/, '');

  // URL format handling
  if (input.includes('github.com')) {
    try {
      const url = new URL(input);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return {
          owner: parts[0],
          repo: parts[1].replace('.git', '')
        };
      }
    } catch (e) {
      // If URL parsing fails, try other formats
    }
  }

  // owner/repo format
  const parts = input.split('/').filter(Boolean);
  if (parts.length === 2) {
    return {
      owner: parts[0],
      repo: parts[1].replace('.git', '')
    };
  }

  throw new Error('Invalid repository format. Use owner/repo or GitHub URL');
}

/**
 * Validate repository existence
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Validation result
 */
export async function validateRepository(owner, repo) {
  const cacheKey = generateCacheKey('validate', owner, repo);
  
  // Check cache first
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    cacheHits++;
    console.log(`Cache HIT for validation ${cacheKey}`);
    return {
      valid: true,
      owner,
      repo,
      source: 'cache'
    };
  }

  try {
    cacheMisses++;
    console.log(`Cache MISS for validation ${cacheKey}`);
    
    // Try to fetch repository metadata
    await octokit.repos.get({ owner, repo });
    
    // Cache successful validation
    const result = { valid: true, owner, repo };
    cache.set(cacheKey, result);
    
    return {
      ...result,
      source: 'api'
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        valid: false,
        error: 'Repository not found',
        owner,
        repo
      };
    }
    throw new Error(`Failed to validate repository: ${error.message}`);
  }
}

/**
 * Generate a cache key for repository data
 * @param {string} type - Type of data (e.g., 'repo', 'commits', 'languages')
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {string} Cache key
 */
function generateCacheKey(type, owner, repo) {
  return `${type}:${owner}/${repo}`;
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    keys: cache.keys(),
    stats: cache.getStats(),
    hitRate: cacheHits / (cacheHits + cacheMisses) || 0
  };
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  cache.flushAll();
  cacheHits = 0;
  cacheMisses = 0;
  console.log('Cache cleared');
}

/**
 * Test function to verify GitHub API access with caching
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} API test result
 */
export async function testGitHubAPI(owner = 'octocat', repo = 'hello-world') {
  const cacheKey = generateCacheKey('test', owner, repo);
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheHits++;
    console.log(`Cache HIT for test ${cacheKey}`);
    return {
      data: cachedData,
      source: 'cache',
      cacheStats: getCacheStats()
    };
  }

  try {
    cacheMisses++;
    console.log(`Cache MISS for test ${cacheKey}`);
    
    const response = await octokit.repos.get({
      owner,
      repo,
    });

    // Cache the response data
    cache.set(cacheKey, response.data);
    
    return {
      data: response.data,
      source: 'api',
      cacheStats: getCacheStats()
    };
  } catch (error) {
    console.error('GitHub API Error:', error.message);
    throw new Error(`Failed to fetch repository: ${error.message}`);
  }
}

/**
 * Format repository metadata for consistent output
 * @param {Object} data - Raw repository data from GitHub API
 * @returns {Object} Formatted repository metadata
 */
function formatRepositoryMetadata(data) {
  return {
    full_name: data.full_name,
    name: data.name,
    description: data.description,
    owner: {
      login: data.owner?.login,
      avatar_url: data.owner?.avatar_url
    },
    language: data.language,
    stargazers_count: data.stargazers_count,
    forks_count: data.forks_count,
    open_issues_count: data.open_issues_count,
    created_at: new Date(data.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    updated_at: new Date(data.updated_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  };
}

/**
 * Get repository metadata with caching
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository metadata
 */
export async function getRepositoryMetadata(owner, repo) {
  const cacheKey = generateCacheKey('metadata', owner, repo);
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheHits++;
    console.log(`Cache HIT for metadata ${cacheKey}`);
    return {
      ...cachedData,
      source: 'cache'
    };
  }

  try {
    cacheMisses++;
    console.log(`Cache MISS for metadata ${cacheKey}`);
    
    const { data } = await octokit.repos.get({
      owner,
      repo
    });

    // Format and cache the metadata
    const metadata = formatRepositoryMetadata(data);
    cache.set(cacheKey, metadata);
    
    return {
      ...metadata,
      source: 'api'
    };
  } catch (error) {
    if (error.status === 404) {
      throw new Error('Repository not found');
    }
    throw new Error(`Failed to fetch repository metadata: ${error.message}`);
  }
}

/**
 * Get repository contributors with caching (medium priority)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of contributors
 */
export async function getRepositoryContributors(owner, repo) {
  const cacheKey = generateCacheKey('contributors', owner, repo);
  const CONTRIBUTORS_LIMIT = 20;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheHits++;
    console.log(`Cache HIT for contributors ${cacheKey}`);
    return {
      data: cachedData,
      source: 'cache'
    };
  }

  try {
    cacheMisses++;
    console.log(`Cache MISS for contributors ${cacheKey}`);
    
    const { data } = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: CONTRIBUTORS_LIMIT
    });

    if (!data || data.length === 0) {
      return {
        data: [],
        message: 'No contributors found'
      };
    }

    // Format contributor data
    const formattedContributors = data.map(contributor => ({
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions
    }));

    // Cache and return
    cache.set(cacheKey, formattedContributors);
    return {
      data: formattedContributors,
      source: 'api'
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        data: [],
        message: 'Repository not found'
      };
    }
    throw new Error(`Failed to fetch contributors: ${error.message}`);
  }
}

/**
 * Get commit data for large repositories using parallel requests and pagination
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Commit statistics
 */
async function getLargeRepositoryCommits(owner, repo) {
  const now = new Date();
  const commits = [];
  
  // Get total commit count first
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  
  // Setup time periods for parallel fetching
  const periods = [
    { days: 7, name: 'week' },    // Last week
    { days: 120, name: 'month' }, // Last 4 months
    { days: 365, name: 'year' }   // Last year
  ];

  // Fetch commits for each period in parallel
  const commitsByPeriod = {};
  await Promise.all(periods.map(async period => {
    const since = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
    const until = period.days === 7 ? now : new Date(since.getTime() + period.days * 24 * 60 * 60 * 1000);
    
    try {
      // Use pagination to get all commits for the period
      const commits = await octokit.paginate(octokit.repos.listCommits, {
        owner,
        repo,
        since: since.toISOString(),
        until: until.toISOString(),
        per_page: 100
      });
      
      commitsByPeriod[period.name] = commits;
    } catch (error) {
      console.error(`Error fetching commits for ${period.name}:`, error);
      commitsByPeriod[period.name] = [];
    }
  }));

  // Process commit dates into frequencies
  const frequencies = {
    week: Array(7).fill(0),
    month: Array(4).fill(0),
    year: Array(12).fill(0),
    decade: Array(10).fill(0)
  };

  // Process weekly data
  const weeklyCommits = commitsByPeriod.week || [];
  weeklyCommits.forEach(commit => {
    const date = new Date(commit.commit.author.date);
    frequencies.week[date.getDay()]++;
  });

  // Process monthly data
  const monthlyCommits = commitsByPeriod.month || [];
  monthlyCommits.forEach(commit => {
    const date = new Date(commit.commit.author.date);
    const monthsAgo = Math.floor((now - date) / (30 * 24 * 60 * 60 * 1000));
    if (monthsAgo < 4) {
      frequencies.month[monthsAgo]++;
    }
  });

  // Process yearly data
  const yearlyCommits = commitsByPeriod.year || [];
  yearlyCommits.forEach(commit => {
    const date = new Date(commit.commit.author.date);
    const monthIndex = date.getMonth();
    frequencies.year[monthIndex]++;
  });

  // For decade data, use repository creation date
  const createdAt = new Date(repoData.created_at);
  const ageInYears = Math.ceil((now - createdAt) / (365 * 24 * 60 * 60 * 1000));
  const totalCommits = repoData.size * 2; // Rough estimate
  
  if (ageInYears <= 10) {
    // If repo is less than 10 years old, distribute commits across actual age
    const commitsPerYear = Math.floor(totalCommits / ageInYears);
    frequencies.decade = Array(10).fill(0).map((_, i) => {
      return i < ageInYears ? commitsPerYear : 0;
    });
  } else {
    // If repo is older than 10 years, distribute evenly
    const commitsPerYear = Math.floor(totalCommits / 10);
    frequencies.decade = Array(10).fill(commitsPerYear);
  }

  // Get more accurate total commit count using parallel requests
  let accurateTotal = 0;
  try {
    // Get commit count using parallel requests for different time ranges
    const commitCounts = await Promise.all(
      Array.from({ length: 10 }, (_, i) => {
        const since = new Date(now.getFullYear() - (9 - i), 0, 1);
        const until = new Date(now.getFullYear() - (8 - i), 0, 1);
        return octokit.repos.listCommits({
          owner,
          repo,
          since: since.toISOString(),
          until: until.toISOString(),
          per_page: 1
        }).then(response => {
          // Get total from response headers
          const match = response.headers.link?.match(/page=(\d+)>; rel="last"/);
          return match ? parseInt(match[1], 10) : 0;
        }).catch(() => 0);
      })
    );
    
    accurateTotal = commitCounts.reduce((sum, count) => sum + count, 0);
  } catch (error) {
    console.error('Error getting accurate commit count:', error);
    accurateTotal = totalCommits;
  }

  return {
    weekly: [],
    total: accurateTotal,
    frequencies,
    source: 'pagination'
  };
}

/**
 * Get repository commits with caching (low priority)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Commit statistics
 */
export async function getRepositoryCommits(owner, repo) {
  const cacheKey = generateCacheKey('commits', owner, repo);
  console.log(`[getRepositoryCommits] Getting commits for ${owner}/${repo}`);

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheHits++;
    console.log(`Cache HIT for commits ${cacheKey}`);
    return {
      data: cachedData,
      source: 'cache'
    };
  }

  try {
    cacheMisses++;
    console.log(`Cache MISS for commits ${cacheKey}`);

    // Get first page of commits (100 commits)
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 100,
      page: 1
    });

    console.log(`[getRepositoryCommits] Fetched ${commits.length} commits`);

    // Initialize frequency arrays
    const frequencies = {
      week: Array(7).fill(0),   // Days of week
      month: Array(4).fill(0),  // Last 4 weeks
      year: Array(12).fill(0),  // Months
      decade: Array(10).fill(0) // Years
    };

    // Process each commit
    commits.forEach(commit => {
      const date = new Date(commit.commit.author.date);
      
      // Week (0 = Sunday, 6 = Saturday)
      frequencies.week[date.getDay()]++;
      
      // Month (0-3 for last 4 weeks)
      const weeksAgo = Math.floor((new Date() - date) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo < 4) {
        frequencies.month[weeksAgo]++;
      }
      
      // Year (0-11 for months)
      frequencies.year[date.getMonth()]++;
      
      // Decade (0-9 for years)
      const yearsAgo = Math.floor((new Date() - date) / (365 * 24 * 60 * 60 * 1000));
      if (yearsAgo < 10) {
        frequencies.decade[yearsAgo]++;
      }
    });

    const processedData = {
      weekly: commits.slice(0, 7).map(commit => ({
        date: commit.commit.author.date,
        author: commit.commit.author.name,
        message: commit.commit.message
      })),
      total: commits.length,
      frequencies,
      source: 'api'
    };

    // Cache the processed data
    cache.set(cacheKey, processedData);

    return processedData;
  } catch (error) {
    console.error(`[getRepositoryCommits] Error fetching commits:`, error);
    throw error;
  }
}

/**
 * Get commit statistics using GitHub Statistics API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Commit statistics
 */
async function getCommitStatistics(owner, repo) {
  // Get commit activity stats for weekly data
  const commitActivityResponse = await octokit.repos.getCommitActivityStats({
    owner,
    repo
  });

  // Get participation stats for total commits
  const participationResponse = await octokit.repos.getParticipationStats({
    owner,
    repo
  });

  // GitHub might return 202 initially while it generates stats
  if (commitActivityResponse.status === 202 || participationResponse.status === 202) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getCommitStatistics(owner, repo);
  }

  const commitActivity = commitActivityResponse.data || [];
  const participation = participationResponse.data || { all: [] };

  // Process weekly data (last 7 days)
  const lastWeek = commitActivity[commitActivity.length - 1]?.days || Array(7).fill(0);
  
  // Process monthly data (last 4 months)
  const monthlyData = Array(4).fill(0);
  const recentWeeks = commitActivity.slice(-16); // Last 16 weeks for 4 months
  recentWeeks.forEach((week, index) => {
    const monthIndex = Math.floor(index / 4);
    if (monthIndex < 4) {
      monthlyData[monthIndex] += week?.total || 0;
    }
  });

  // Process yearly data (last 12 months)
  const monthTotals = Array(12).fill(0);
  commitActivity.slice(-52).forEach((week, index) => {
    const monthIndex = Math.floor(index / 4.33);
    if (monthIndex < 12) {
      monthTotals[monthIndex] += week?.total || 0;
    }
  });

  // For decade data, use participation data
  const decadeData = Array(10).fill(0);
  const yearlyTotal = participation.all.reduce((sum, count) => sum + (count || 0), 0);
  const averagePerYear = Math.floor(yearlyTotal / 10);
  decadeData.fill(averagePerYear);

  return {
    weekly: commitActivity,
    frequencies: {
      week: lastWeek,
      month: monthlyData,
      year: monthTotals,
      decade: decadeData
    }
  };
}

/**
 * Get repository languages with caching (high priority)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Language data
 */
export async function getRepositoryLanguages(owner, repo) {
  const cacheKey = generateCacheKey('languages', owner, repo);
  console.log(`[getRepositoryLanguages] Getting languages for ${owner}/${repo}`);
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheHits++;
    console.log(`[getRepositoryLanguages] Cache HIT for ${cacheKey}`);
    return {
      data: cachedData,
      source: 'cache'
    };
  }

  try {
    cacheMisses++;
    console.log(`[getRepositoryLanguages] Cache MISS for ${cacheKey}`);
    
    // Get language data from GitHub API
    const { data: rawData } = await octokit.repos.listLanguages({
      owner,
      repo
    });

    console.log(`[getRepositoryLanguages] Raw data:`, rawData);

    if (!rawData || Object.keys(rawData).length === 0) {
      console.log(`[getRepositoryLanguages] No languages found for ${owner}/${repo}`);
      return {
        data: {
          languages: [],
          total: 0,
          raw: {}
        },
        message: 'No languages found'
      };
    }

    // Calculate percentages and sort by usage
    const total = Object.values(rawData).reduce((sum, bytes) => sum + bytes, 0);
    const languages = Object.entries(rawData)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: ((bytes / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const processedData = {
      languages,
      total,
      raw: rawData
    };

    console.log(`[getRepositoryLanguages] Processed data:`, processedData);

    // Cache the processed data
    cache.set(cacheKey, processedData);

    return {
      data: processedData,
      source: 'api'
    };
  } catch (error) {
    console.error(`[getRepositoryLanguages] Error:`, error);
    if (error.status === 404) {
      return {
        data: {
          languages: [],
          total: 0,
          raw: {}
        },
        message: 'Repository not found'
      };
    }
    throw new Error(`Failed to fetch languages: ${error.message}`);
  }
}

/**
 * Get repository files with changes (low priority)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of files with change counts
 */
export async function getRepositoryFiles(owner, repo) {
  const cacheKey = generateCacheKey('files', owner, repo);
  console.log(`[getRepositoryFiles] Getting files for ${owner}/${repo}`);

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    cacheHits++;
    console.log(`[getRepositoryFiles] Cache HIT for ${cacheKey}`);
    return {
      data: cachedData,
      source: 'cache'
    };
  }

  try {
    cacheMisses++;
    console.log(`[getRepositoryFiles] Cache MISS for ${cacheKey}`);

    // Get the repository tree
    const { data: { tree } } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 1
    });

    console.log(`[getRepositoryFiles] Raw tree data:`, tree.length, 'items');

    // Process tree into directory structure
    const root = {
      name: repo,
      type: 'directory',
      path: '',
      children: []
    };

    tree.forEach(item => {
      const parts = item.path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');
        
        // Find or create the node
        let node = current.children.find(n => n.path === path);
        
        if (!node) {
          node = {
            name: part,
            path: path,
            type: isLast ? item.type : 'tree',
            children: []
          };
          current.children.push(node);
        }
        
        current = node;
      });
    });

    // Sort directories first, then files
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type === 'tree' && b.type !== 'tree') return -1;
        if (a.type !== 'tree' && b.type === 'tree') return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children) sortNodes(node.children);
      });
    };

    sortNodes(root.children);
    console.log('[getRepositoryFiles] Processed tree structure:', root);

    // Cache the processed data
    cache.set(cacheKey, root);

    return {
      data: root,
      source: 'api'
    };
  } catch (error) {
    console.error('[getRepositoryFiles] Error:', error);
    if (error.status === 404) {
      return {
        data: {
          name: repo,
          type: 'directory',
          path: '',
          children: []
        },
        message: 'Repository not found'
      };
    }
    throw error;
  }
}

async function fetchAllCommits(owner, repo) {
  const commits = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 100,
      page
    });

    commits.push(...response.data);
    hasNextPage = response.headers.link?.includes('rel="next"');
    page++;
  }

  return commits;
}

// Export all functions
export default {
  testGitHubAPI,
  getCacheStats,
  clearCache,
  parseRepositoryInput,
  validateRepository,
  getRepositoryMetadata,
  getRepositoryContributors,
  getRepositoryCommits,
  getRepositoryLanguages,
  getRepositoryFiles
};
