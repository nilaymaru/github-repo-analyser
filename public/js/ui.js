import { api } from './api.js';
import { createCommitChart } from './charts.js';

// DOM Elements
const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const main = document.querySelector('.main');
const repoInput = document.getElementById('repoInput');
const submitButton = document.querySelector('.top-bar__submit');

// Store current repository info
let currentRepo = {
  owner: 'octocat',
  repo: 'hello-world'
};

// Store contributors data and state
let contributorsData = [];
let isAscending = true;

/**
 * Display a message in the app container
 * @param {string} message - Message to display
 * @param {string} type - Message type (success/error/loading)
 */
function displayMessage(message, type = 'loading') {
  app.innerHTML = `
    <div class="${type}">
      ${message}
    </div>
  `;
}

/**
 * Display a welcome message on the home page
 */
function displayWelcomeMessage() {
  app.innerHTML = `
    <div class="home">
      <h1 class="home__title">GitHub Repository Analyzer</h1>
      <p class="home__subtitle">
        Enter a GitHub repository URL to analyze its metadata, contributors, commits, languages, and files.
      </p>
    </div>
  `;
}

/**
 * Parse GitHub repository URL
 * @param {string} url - GitHub repository URL
 * @returns {Object} { owner, repo } or null if invalid
 */
function parseRepoUrl(url) {
  try {
    const regex = /github\.com[/:]([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Update repository placeholder text
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
function updateRepoPlaceholder(owner, repo) {
  const repoOwner = document.querySelector('.sidebar__repo-owner');
  const repoName = document.querySelector('.sidebar__repo-name');
  
  if (repoOwner && repoName) {
    repoOwner.textContent = `${owner}/`;
    repoName.textContent = repo;
  }
}

/**
 * Update repository input value
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
function updateRepoInput(owner, repo) {
  if (repoInput) {
    repoInput.value = `https://github.com/${owner}/${repo}`;
  }
}

/**
 * Create a repository card
 * @param {string} type - Card type (owner, language, stats, info)
 * @param {Object} content - Card content
 * @returns {HTMLElement} Card element
 */
function createRepoCard(type, content) {
  const card = document.createElement('div');
  card.className = `repo-card repo-card--${type}`;
  
  let icon = '';
  switch (type) {
    case 'owner':
      icon = '<svg class="repo-card__icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-13c-.28 0-.53.11-.7.29l-2.82 2.83c-.39-.23-.86-.36-1.38-.36-1.04 0-1.9.86-1.9 1.9 0 1.04.86 1.9 1.9 1.9.53 0 1 .11 1.38-.36l2.83-2.82c.18-.18.3-.42.3-.7 0-.55-.45-1-1-1z"/></svg>';
      break;
    case 'language':
      icon = '<svg class="repo-card__icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
      break;
    case 'stats':
      icon = '<svg class="repo-card__icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-13c-.28 0-.53.11-.7.29l-2.82 2.83c-.39-.23-.86-.36-1.38-.36-1.04 0-1.9.86-1.9 1.9 0 1.04.86 1.9 1.9 1.9.53 0 1 .11 1.38-.36l2.83-2.82c.18-.18.3-.42.3-.7 0-.55-.45-1-1-1z"/></svg>';
      break;
    case 'info':
      icon = '<svg class="repo-card__icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
      break;
  }
  
  card.innerHTML = `
    <div class="repo-card__header">
      ${icon}
      <h3>${content.label}</h3>
    </div>
    <div class="repo-card__content">
      ${content.value}
    </div>
  `;
  
  return card;
}

/**
 * Display repository metadata in cards
 * @param {Object} metadata - Repository metadata
 */
function displayRepoMetadata(metadata) {
  // Clear existing content first
  app.innerHTML = '';
  
  const repoInfo = document.createElement('div');
  repoInfo.className = 'repo-info';
  
  // Extract repository name from full_name
  const repoName = metadata.full_name?.split('/').pop() || metadata.name;
  
  // Create cards
  const cards = [
    // Owner card
    createRepoCard('owner', {
      label: 'Repository Owner',
      value: `
        <img src="${metadata.owner?.avatar_url}" alt="Owner avatar" class="avatar" />
        <span>${metadata.owner?.login || metadata.owner}</span>
      `
    }),
    
    // Language card
    createRepoCard('language', {
      label: 'Primary Language',
      value: metadata.language || 'No language specified'
    }),
    
    // Stats cards
    createRepoCard('stats', {
      label: 'Repository Stats',
      value: `
        <div class="repo-card__stats">
          <div class="repo-card__stat">
            <span class="repo-card__stat-label">Stars</span>
            <span class="repo-card__stat-value">${metadata.stargazers_count || 0}</span>
          </div>
          <div class="repo-card__stat">
            <span class="repo-card__stat-label">Forks</span>
            <span class="repo-card__stat-value">${metadata.forks_count || 0}</span>
          </div>
          <div class="repo-card__stat">
            <span class="repo-card__stat-label">Issues</span>
            <span class="repo-card__stat-value">${metadata.open_issues_count || 0}</span>
          </div>
        </div>
      `
    }),
    
    // Info card
    createRepoCard('info', {
      label: 'Repository Info',
      value: `
        <div class="repo-card__info">
          <p class="repo-card__description">${metadata.description || 'No description provided'}</p>
          <div class="repo-card__details">
            <div class="repo-card__detail">
              <span class="repo-card__detail-label">Created</span>
              <span class="repo-card__detail-value">${metadata.created_at ? new Date(metadata.created_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
            <div class="repo-card__detail">
              <span class="repo-card__detail-label">Updated</span>
              <span class="repo-card__detail-value">${metadata.updated_at ? new Date(metadata.updated_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>
      `
    })
  ];
  
  // Add cards to container
  cards.forEach(card => repoInfo.appendChild(card));
  
  app.appendChild(repoInfo);
}

/**
 * Display contributors in a table view
 * @param {Object} data - Contributors data
 */
function displayContributors(data) {
  // Clear existing content
  app.innerHTML = '';
  
  // Create contributors container
  const contributorsContainer = document.createElement('div');
  contributorsContainer.className = 'contributors';
  
  // Add sort button
  const sortButton = document.createElement('button');
  sortButton.className = 'contributors__sort-button';
  sortButton.innerHTML = `
    <svg class="contributors__sort-icon" viewBox="0 0 24 24">
      <path d="M16 17h2l-4-4 4-4v2H8v2h8v3zm-4-5V3H8v2h4v2H8v2h4v2H8v2h4v2H8v3h6v-8h-2z"/>
    </svg>
    Sort by ${isAscending ? 'Descending' : 'Ascending'}
  `;
  sortButton.addEventListener('click', () => {
    isAscending = !isAscending;
    displayContributors(data);
  });
  
  // Add back button
  const backButton = document.createElement('button');
  backButton.className = 'contributors__back-button';
  backButton.innerHTML = `
    <svg class="contributors__back-icon" viewBox="0 0 24 24">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
    </svg>
    Back to Home
  `;
  backButton.addEventListener('click', () => {
    const { owner, repo } = currentRepo;
    if (owner && repo) {
      api.getMetadata(owner, repo)
        .then(response => displayRepoMetadata(response.data))
        .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
    } else {
      displayWelcomeMessage();
    }
  });
  
  // Create contributors table
  const contributorsTable = document.createElement('div');
  contributorsTable.className = 'contributors__table';
  
  // Add table header
  contributorsTable.innerHTML = `
    <div class="contributors__header">
      <div class="contributors__header-cell">Username</div>
      <div class="contributors__header-cell">Contributions</div>
    </div>
  `;
  
  // Sort contributors
  const sortedContributors = [...data].sort((a, b) => {
    if (isAscending) {
      return a.contributions - b.contributions;
    } else {
      return b.contributions - a.contributions;
    }
  });
  
  // Add contributors rows
  sortedContributors.forEach((contributor, index) => {
    const row = document.createElement('div');
    row.className = 'contributors__row';
    row.innerHTML = `
      <div class="contributors__cell">
        <span class="contributors__username">${contributor.login}</span>
      </div>
      <div class="contributors__cell">
        <span class="contributors__contributions">${contributor.contributions}</span>
      </div>
    `;
    
    // Add staggered animation delay
    row.style.animationDelay = `${index * 0.1}s`;
    
    contributorsTable.appendChild(row);
  });
  
  // Add empty state if no contributors
  if (sortedContributors.length === 0) {
    contributorsTable.innerHTML = `
      <div class="contributors__empty">
        <p>No contributors found yet</p>
      </div>
    `;
  }
  
  // Add elements to container
  contributorsContainer.appendChild(backButton);
  contributorsContainer.appendChild(sortButton);
  contributorsContainer.appendChild(contributorsTable);
  
  app.appendChild(contributorsContainer);
}

/**
 * Display commit frequencies with tables
 * @param {Object} response - API response containing commit data
 */
function displayCommitFrequencies(response) {
  console.log('[displayCommitFrequencies] Raw response:', response);
  
  if (!response?.data?.frequencies) {
    console.error('[displayCommitFrequencies] Invalid data structure:', response);
    displayMessage('No commit data available', 'error');
    return;
  }

  const { frequencies, total, weekly } = response.data;
  console.log('[displayCommitFrequencies] Data:', { frequencies, total, weekly });

  const app = document.querySelector('#app');
  app.innerHTML = '';
  
  // Create container
  const container = document.createElement('div');
  container.className = 'commits';
  
  // Add total commits
  const totalEl = document.createElement('div');
  totalEl.className = 'commits__total';
  totalEl.textContent = `Total Commits: ${total?.toLocaleString() || 0}`;
  container.appendChild(totalEl);

  // Recent commits section
  if (weekly && weekly.length > 0) {
    const recentSection = document.createElement('div');
    recentSection.className = 'commits__section';
    
    const recentTitle = document.createElement('h2');
    recentTitle.className = 'commits__title';
    recentTitle.textContent = 'Recent Commits';
    recentSection.appendChild(recentTitle);

    const recentTable = document.createElement('table');
    recentTable.className = 'commits__table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Author</th>
        <th>Message</th>
      </tr>
    `;
    recentTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    weekly.forEach(commit => {
      const row = document.createElement('tr');
      const date = new Date(commit.date);
      row.innerHTML = `
        <td>${date.toLocaleDateString()}</td>
        <td>${commit.author}</td>
        <td>${commit.message}</td>
      `;
      tbody.appendChild(row);
    });
    recentTable.appendChild(tbody);
    recentSection.appendChild(recentTable);
    container.appendChild(recentSection);
  }

  // Frequency sections
  const periods = [
    {
      name: 'Week',
      data: frequencies.week,
      labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    {
      name: 'Month',
      data: frequencies.month,
      labels: ['Last Week', '2 Weeks Ago', '3 Weeks Ago', '4 Weeks Ago']
    },
    {
      name: 'Year',
      data: frequencies.year,
      labels: Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return date.toLocaleString('default', { month: 'long' });
      })
    },
    {
      name: 'Decade',
      data: frequencies.decade,
      labels: Array.from({ length: 10 }, (_, i) => {
        const year = new Date().getFullYear() - (9 - i);
        return year.toString();
      })
    }
  ];

  periods.forEach(period => {
    const section = document.createElement('div');
    section.className = 'commits__section';
    
    const title = document.createElement('h2');
    title.className = 'commits__title';
    title.textContent = `Commits by ${period.name}`;
    section.appendChild(title);

    const table = document.createElement('table');
    table.className = 'commits__table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Period</th>
        <th>Commits</th>
        <th>Distribution</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const maxValue = Math.max(...period.data);
    
    period.data.forEach((value, index) => {
      const row = document.createElement('tr');
      const percentage = maxValue > 0 ? (value / maxValue * 100) : 0;
      
      row.innerHTML = `
        <td class="commits__label">${period.labels[index]}</td>
        <td class="commits__value">${value}</td>
        <td>
          <div class="commits__bar">
            <div class="commits__bar-fill" style="width: ${percentage}%"></div>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  });

  app.appendChild(container);
}

/**
 * Display repository languages with pie chart
 * @param {Object} response - API response containing language data
 */
function displayLanguages(response) {
  console.log('Displaying languages:', response);
  
  if (!response || !response.data || !response.data.languages) {
    displayMessage('No language data available', 'error');
    return;
  }

  const data = response.data;
  const app = document.querySelector('#app');
  app.innerHTML = '';

  // Create language chart container
  const container = document.createElement('div');
  container.className = 'language-container';
  
  // Create chart section
  const chartSection = document.createElement('div');
  chartSection.className = 'language-chart';
  
  // Add title
  const title = document.createElement('h2');
  title.className = 'language-chart__title';
  title.textContent = 'Language Distribution';
  chartSection.appendChild(title);

  // Create canvas wrapper for fixed aspect ratio
  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'language-chart__wrapper';
  
  // Create canvas for pie chart
  const canvas = document.createElement('canvas');
  canvas.className = 'language-chart__canvas';
  canvasWrapper.appendChild(canvas);
  chartSection.appendChild(canvasWrapper);

  // Create pie chart
  const languages = data.languages;
  createLanguagePieChart(canvas, {
    labels: languages.map(lang => lang.name),
    data: languages.map(lang => parseFloat(lang.percentage)),
    colors: languages.map(lang => languageColors[lang.name] || '#858585')
  });

  // Create language stats section
  const statsSection = document.createElement('div');
  statsSection.className = 'language-stats';
  
  // Add stats title
  const statsTitle = document.createElement('h3');
  statsTitle.className = 'language-stats__title';
  statsTitle.textContent = 'Language Details';
  statsSection.appendChild(statsTitle);

  // Create language list
  const list = document.createElement('ul');
  list.className = 'language-list';

  languages.forEach(lang => {
    const item = document.createElement('li');
    item.className = 'language-list__item';
    
    const color = document.createElement('span');
    color.className = 'language-list__color';
    color.style.backgroundColor = languageColors[lang.name] || '#858585';
    
    const name = document.createElement('span');
    name.className = 'language-list__name';
    name.textContent = lang.name;
    
    const percentage = document.createElement('span');
    percentage.className = 'language-list__percentage';
    percentage.textContent = `${lang.percentage}%`;
    
    const size = document.createElement('span');
    size.className = 'language-list__size';
    size.textContent = formatBytes(lang.bytes);
    
    item.appendChild(color);
    item.appendChild(name);
    item.appendChild(percentage);
    item.appendChild(size);
    list.appendChild(item);
  });

  statsSection.appendChild(list);
  
  // Add total size
  const totalSize = document.createElement('div');
  totalSize.className = 'language-stats__total';
  totalSize.textContent = `Total Size: ${formatBytes(data.total)}`;
  statsSection.appendChild(totalSize);

  container.appendChild(chartSection);
  container.appendChild(statsSection);
  app.appendChild(container);
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Display repository file tree
 * @param {Object} response - API response containing file tree data
 */
function displayFileTree(response) {
  console.log('[displayFileTree] Raw response:', response);
  
  if (!response || !response.data) {
    console.error('[displayFileTree] Invalid response:', response);
    displayMessage('Failed to load file tree', 'error');
    return;
  }

  const data = response.data;
  console.log('[displayFileTree] Processed data:', data);

  const app = document.querySelector('#app');
  if (!app) {
    console.error('[displayFileTree] App container not found');
    return;
  }

  // Clear existing content
  app.innerHTML = '';

  // Create main container
  const container = document.createElement('div');
  container.className = 'files-container';
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Repository Files';
  container.appendChild(title);

  // Create file tree container
  const treeContainer = document.createElement('div');
  treeContainer.className = 'file-tree';
  
  // Create root item
  if (data.children && data.children.length > 0) {
    const rootItem = createTreeItem(data);
    treeContainer.appendChild(rootItem);
  } else {
    const noFiles = document.createElement('div');
    noFiles.className = 'file-tree__item';
    noFiles.textContent = 'No files found';
    treeContainer.appendChild(noFiles);
  }
  
  container.appendChild(treeContainer);
  app.appendChild(container);
}

/**
 * Create a tree item element
 * @param {Object} node - File tree node
 * @returns {HTMLElement} Tree item element
 */
function createTreeItem(node) {
  const item = document.createElement('div');
  item.className = 'file-tree__item';
  
  // Create toggle if it's a directory
  const toggle = document.createElement('div');
  toggle.className = 'file-tree__toggle';
  toggle.innerHTML = node.children && node.children.length > 0 ? '▼' : '▶';
  item.appendChild(toggle);
  
  // Create icon
  const icon = document.createElement('div');
  icon.className = `file-tree__icon file-tree__icon--${node.type}`;
  item.appendChild(icon);
  
  // Create name
  const name = document.createElement('span');
  name.className = 'file-tree__name';
  name.textContent = node.name;
  item.appendChild(name);
  
  // Add click handler for directories
  if (node.children && node.children.length > 0) {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      item.classList.toggle('file-tree__item--collapsed');
      const toggle = item.querySelector('.file-tree__toggle');
      toggle.innerHTML = item.classList.contains('file-tree__item--collapsed') ? '▶' : '▼';
    });

    // Add children
    const children = document.createElement('div');
    children.className = 'file-tree__children';
    node.children.forEach(child => {
      children.appendChild(createTreeItem(child));
    });
    item.appendChild(children);
  }

  return item;
}

/**
 * Update sidebar with repository information
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
function updateSidebar(owner, repo) {
  console.log(`[updateSidebar] Updating for ${owner}/${repo}`);
  
  // Update placeholder and input
  updateRepoPlaceholder(owner, repo);
  updateRepoInput(owner, repo);
}

/**
 * Handle button clicks
 */
function handleButtonClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const { type } = button.dataset;
  const owner = button.dataset.owner;
  const repo = button.dataset.repo;

  if (!owner || !repo) {
    displayMessage('Please select a repository first', 'error');
    return;
  }

  // Clear any existing content
  const app = document.querySelector('#app');
  app.innerHTML = '';

  switch (type) {
    case 'languages':
      api.getLanguages(owner, repo)
        .then(response => displayLanguages(response))
        .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
      break;

    case 'commits':
      api.getCommits(owner, repo)
        .then(response => displayCommitFrequencies(response))
        .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
      break;

    case 'files':
      api.getFiles(owner, repo)
        .then(response => displayFiles(response))
        .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
      break;

    case 'contributors':
      api.getContributors(owner, repo)
        .then(response => displayContributors(response))
        .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
      break;
  }
}

/**
 * Display repository files in main content area
 * @param {Object} response - API response containing file tree data
 */
function displayFiles(response) {
  console.log('[displayFiles] Raw response:', response);
  
  if (!response || !response.data) {
    console.error('[displayFiles] Invalid response:', response);
    displayMessage('Failed to load files', 'error');
    return;
  }

  const data = response.data;
  console.log('[displayFiles] Processed data:', data);

  const app = document.querySelector('#app');
  if (!app) {
    console.error('[displayFiles] App container not found');
    return;
  }

  // Create main container
  const container = document.createElement('div');
  container.className = 'files-container';
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Repository Files';
  container.appendChild(title);

  // Create file tree container
  const treeContainer = document.createElement('div');
  treeContainer.className = 'file-tree';
  
  // Create root item
  if (data.children && data.children.length > 0) {
    const rootItem = createTreeItem(data);
    treeContainer.appendChild(rootItem);
  } else {
    const noFiles = document.createElement('div');
    noFiles.className = 'file-tree__item';
    noFiles.textContent = 'No files found';
    treeContainer.appendChild(noFiles);
  }
  
  container.appendChild(treeContainer);
  app.appendChild(container);
}

/**
 * Handle repository analysis
 */
async function handleRepoAnalysis() {
  const url = repoInput.value.trim();
  if (!url) {
    displayMessage('Please enter a GitHub repository URL', 'error');
    return;
  }

  const repoData = parseRepoUrl(url);
  if (!repoData) {
    displayMessage('Invalid GitHub repository URL', 'error');
    return;
  }

  const { owner, repo } = repoData;
  currentRepo = { owner, repo };
  
  // Update placeholder and input
  updateRepoPlaceholder(owner, repo);
  updateRepoInput(owner, repo);

  // Show loading message
  displayMessage(`Analyzing ${owner}/${repo}...`);

  try {
    // Validate repository first
    const validation = await api.validate(`${owner}/${repo}`);
    if (!validation.data.valid) {
      throw new Error(validation.data.message || 'Repository not found');
    }

    // Get repository metadata
    const metadataResponse = await api.getMetadata(owner, repo);
    const metadata = metadataResponse.data;
    displayRepoMetadata(metadata);

    // Update active link to Home
    document.querySelectorAll('.sidebar__link').forEach(link => {
      link.classList.remove('sidebar__link--active');
      if (link.textContent.toLowerCase() === 'home') {
        link.classList.add('sidebar__link--active');
      }
    });

  } catch (error) {
    console.error('Analysis Error:', error);
    displayMessage(`Error analyzing repository:\n${error.message}`, 'error');
  }
}

/**
 * Initialize the UI
 */
export function initUI() {
  console.log('Initializing UI...');
  
  // Show loading message
  displayMessage('Connecting to GitHub API...');
  
  // Test API connection
  api.test()
    .then(response => {
      console.log('API Test Success:', response);
      displayWelcomeMessage();
    })
    .catch(error => {
      console.error('API Test Failed:', error);
      displayMessage(`Error connecting to API:\n${error.message}`, 'error');
    });

  // Add click handlers for sidebar links
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Remove active class from all links
      document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('sidebar__link--active'));
      // Add active class to clicked link
      link.classList.add('sidebar__link--active');
      
      // Handle navigation based on link text
      const section = link.textContent.toLowerCase();
      const { owner, repo } = currentRepo;
      
      // Clear existing content
      app.innerHTML = '';
      
      switch (section) {
        case 'home':
          if (owner && repo) {
            api.getMetadata(owner, repo)
              .then(response => displayRepoMetadata(response.data))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayWelcomeMessage();
          }
          break;
        case 'contributors':
          if (owner && repo) {
            api.getContributors(owner, repo)
              .then(response => {
                contributorsData = response.data;
                displayContributors(contributorsData);
              })
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayMessage('Please select a repository first', 'error');
          }
          break;
        case 'commits':
          if (owner && repo) {
            api.getCommits(owner, repo)
              .then(response => displayCommitFrequencies(response))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayMessage('Please select a repository first', 'error');
          }
          break;
        case 'languages':
          if (owner && repo) {
            api.getLanguages(owner, repo)
              .then(response => displayLanguages(response))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayMessage('Please select a repository first', 'error');
          }
          break;
        case 'files':
          if (owner && repo) {
            api.getFiles(owner, repo)
              .then(response => displayFiles(response))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayMessage('Please select a repository first', 'error');
          }
          break;
      }
    });
  });

  // Add mobile menu toggle functionality
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Add repository input handling
  if (submitButton) {
    submitButton.addEventListener('click', handleRepoAnalysis);
  }

  // Add keyboard handling for input
  if (repoInput) {
    repoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRepoAnalysis();
      }
    });
  }

  // Add button click handlers
  document.querySelectorAll('button[data-type]').forEach(button => {
    button.addEventListener('click', handleButtonClick);
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);
