import express from 'express';
import { 
  getCacheStats, 
  clearCache, 
  parseRepositoryInput, 
  validateRepository,
  getRepositoryMetadata,
  getRepositoryContributors,
  getRepositoryCommits,
  getRepositoryLanguages,
  getRepositoryFiles
} from './github.js';

const router = express.Router();

// Health check endpoint with security headers verification
router.get('/health', (req, res) => {
  // Set a test CORS header to verify it's working
  res.set('Access-Control-Allow-Origin', '*');
  
  const headers = res.getHeaders();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    headers: {
      cors: headers['access-control-allow-origin'] !== undefined,
      csp: headers['content-security-policy'] !== undefined,
      xss: headers['x-xss-protection'] !== undefined
    },
    headersList: headers
  });
});

// Test GitHub API endpoint
router.get('/test-repo', async (req, res) => {
  try {
    // Use hardcoded values for testing
    const owner = 'octocat';
    const repo = 'hello-world';
    
    // Test the GitHub API
    const result = await getRepositoryMetadata(owner, repo);
    
    // Return JSON response
    res.setHeader('Content-Type', 'application/json');
    res.json({
      status: 'success',
      data: result,
      message: 'Test successful'
    });
  } catch (error) {
    console.error('Test Repo Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Repository validation endpoint
router.get('/repos/validate', async (req, res) => {
  try {
    const repo = req.query.repo;
    
    if (!repo) {
      return res.status(400).json({
        status: 'error',
        message: 'Repository parameter is required. Use ?repo=owner/repository'
      });
    }

    // Handle URL-encoded input
    try {
      const decodedRepo = decodeURIComponent(repo);
      const { owner, repo: repoName } = parseRepositoryInput(decodedRepo);
      
      if (!owner || !repoName) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid repository format. Use owner/repository'
        });
      }

      const result = await validateRepository(owner, repoName);
      res.json({
        status: 'success',
        data: result,
        message: 'Repository validated successfully'
      });
    } catch (e) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL encoding'
      });
    }
  } catch (error) {
    console.error('Validation Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Repository metadata endpoint
router.get('/repos/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const metadata = await getRepositoryMetadata(owner, repo);
    res.json({
      status: 'success',
      data: metadata
    });
  } catch (error) {
    console.error('Metadata Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Contributors endpoint
router.get('/repos/:owner/:repo/contributors', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const contributors = await getRepositoryContributors(owner, repo);
    res.json({
      status: 'success',
      data: contributors.data // Access the data property directly
    });
  } catch (error) {
    console.error('Contributors Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Commit routes
router.get('/api/commits', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    console.log(`[/api/commits] Fetching commits for ${owner}/${repo}`);
    
    if (!owner || !repo) {
      console.error('[/api/commits] Missing owner or repo');
      return res.status(400).json({
        status: 'error',
        message: 'Owner and repo parameters are required'
      });
    }

    const commits = await getRepositoryCommits(owner, repo);
    console.log('[/api/commits] Response:', commits);

    res.json({
      status: 'success',
      data: commits.data
    });
  } catch (error) {
    console.error('[/api/commits] Error:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to fetch commits: ${error.message}`
    });
  }
});

// Language routes
router.get('/api/languages', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    console.log(`[/api/languages] Fetching languages for ${owner}/${repo}`);
    
    if (!owner || !repo) {
      console.error('[/api/languages] Missing owner or repo');
      return res.status(400).json({
        status: 'error',
        message: 'Owner and repo parameters are required'
      });
    }

    const languages = await getRepositoryLanguages(owner, repo);
    console.log('[/api/languages] Response:', languages);

    res.json({
      status: 'success',
      data: languages.data
    });
  } catch (error) {
    console.error('[/api/languages] Error:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to fetch languages: ${error.message}`
    });
  }
});

// Files endpoint
router.get('/repos/:owner/:repo/files', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const files = await getRepositoryFiles(owner, repo);
    res.json({
      status: 'success',
      data: files
    });
  } catch (error) {
    console.error('Files Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Files route
router.get('/api/files', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    console.log(`[/api/files] Fetching files for ${owner}/${repo}`);
    
    if (!owner || !repo) {
      console.error('[/api/files] Missing owner or repo');
      return res.status(400).json({
        status: 'error',
        message: 'Owner and repo parameters are required'
      });
    }

    const files = await getRepositoryFiles(owner, repo);
    console.log('[/api/files] Response:', files);

    res.json({
      status: 'success',
      data: files.data
    });
  } catch (error) {
    console.error('[/api/files] Error:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to fetch files: ${error.message}`
    });
  }
});

// Cache endpoints
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Cache Stats Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

router.post('/cache/clear', async (req, res) => {
  try {
    await clearCache();
    res.json({
      status: 'success',
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Cache Clear Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
