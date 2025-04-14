import { api } from './api.js';
import { createCommitChart } from './charts.js';

// Constants for issue analysis
const STALE_THRESHOLD_DAYS = 30; // Issues with no updates for 30+ days are considered stale

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
  if (type === 'loading') {
    // Always use the GitHub Octocat animation for consistent branding
    const octocatAnimation = `<div class="loading-octocat"></div>`;
    
    app.innerHTML = `
      <div class="${type}">
        ${octocatAnimation}
        <p>${message}</p>
      </div>
    `;
  } else {
    app.innerHTML = `
      <div class="${type}">
        ${message}
      </div>
    `;
  }
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
 * Generate shell script content for cloning a GitHub repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {boolean} useSSH - Whether to use SSH instead of HTTPS
 * @returns {string} Shell script content
 */
function generateCloneScript(owner, repo, useSSH = false) {
  const repoUrl = useSSH 
    ? `git@github.com:${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;
  
  return `#!/bin/bash

# Clone script for ${owner}/${repo}
# Generated by GitHub Repository Analyzer

echo "Cloning the repository ${owner}/${repo}..."

# Clone the repository
git clone ${repoUrl}

# Change to the repository directory
cd ${repo}

echo "Done! You're now inside the ${repo} directory."
echo "Repository URL: https://github.com/${owner}/${repo}"

# Uncomment the following lines if you want to perform additional actions:
# echo "Installing dependencies..."
# npm install    # For Node.js projects
# pip install -r requirements.txt    # For Python projects
# composer install    # For PHP projects
`;
}

/**
 * Download a text file
 * @param {string} filename - Name of the file to download
 * @param {string} content - Content of the file
 */
function downloadTextFile(filename, content) {
  // Create a blob with the content
  const blob = new Blob([content], { type: 'text/plain' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Display repository metadata in cards
 * @param {Object} metadata - Repository metadata
 */
function displayRepoMetadata(metadata) {
  console.log('[displayRepoMetadata] Displaying metadata:', metadata);
  
  // Clear existing content first
  app.innerHTML = '';
  
  // Create main container
  const container = document.createElement('div');
  container.className = 'repo-container';
  
  const repoInfo = document.createElement('div');
  repoInfo.className = 'repo-info';
  
  // Extract repository name from full_name
  const repoName = metadata.full_name?.split('/').pop() || metadata.name;
  const owner = metadata.owner?.login || currentRepo.owner;
  
  console.log(`[displayRepoMetadata] Owner: ${owner}, Repo: ${repoName}`);
  
  // Create row 1 with owner and language cards
  const row1 = document.createElement('div');
  row1.className = 'repo-row';
  
  // Owner card
  const ownerCard = createRepoCard('owner', {
    label: 'Repository Owner',
    value: `
      <img src="${metadata.owner?.avatar_url}" alt="Owner avatar" class="avatar" />
      <span>${metadata.owner?.login || metadata.owner}</span>
    `
  });
  
  // Language card
  const languageCard = createRepoCard('language', {
    label: 'Primary Language',
    value: metadata.language || 'No language specified'
  });
  
  // Add cards to row 1
  row1.appendChild(ownerCard);
  row1.appendChild(languageCard);
  repoInfo.appendChild(row1);
  
  // Create row 2 with stats and info cards
  const row2 = document.createElement('div');
  row2.className = 'repo-row';
  
  // Stats card
  const statsCard = createRepoCard('stats', {
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
  });
  
  // Info card
  const infoCard = createRepoCard('info', {
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
  });
  
  // Add cards to row 2
  row2.appendChild(statsCard);
  row2.appendChild(infoCard);
  repoInfo.appendChild(row2);
  
  // Create row 3 with download card centered
  const row3 = document.createElement('div');
  row3.className = 'repo-row repo-row--centered';
  
  // Download card
  const downloadCard = createRepoCard('download', {
    label: 'Clone Repository',
    value: `
      <div class="repo-card__download">
        <button class="repo-card__download-button">
          <svg class="repo-card__download-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Download Clone Script
        </button>
        <p class="repo-card__download-help">
          After downloading, run with: <code>bash clone-${owner}-${repoName}.sh</code>
          <br>or make executable: <code>chmod +x clone-*.sh && ./clone-*.sh</code>
        </p>
      </div>
    `
  });
  
  // Add download card to row 3
  row3.appendChild(downloadCard);
  repoInfo.appendChild(row3);
  
  // Add repo info to container
  container.appendChild(repoInfo);
  
  // Add event listener to download button (after cards are added to DOM)
  setTimeout(() => {
    const downloadButton = document.querySelector('.repo-card__download-button');
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        console.log(`Generating clone script for ${owner}/${repoName}`);
        // Generate script content
        const scriptContent = generateCloneScript(owner, repoName);
        
        // Download the script
        downloadTextFile(`clone-${owner}-${repoName}.sh`, scriptContent);
      });
    }
  }, 100);
  
  // Add container to app
  app.appendChild(container);
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
      <path d="M16 17h2l-4-4 4-4v2H8v2h8v3zm-4-5V3H8v2h4v2H8v2h4v2H8v3h6v-8h-2z"/>
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
  
  // Recent commits section
  if (weekly && Array.isArray(weekly) && weekly.length > 0) {
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
      const date = commit?.date ? new Date(commit.date) : new Date();
      row.innerHTML = `
        <td>${date.toLocaleDateString()}</td>
        <td>${commit?.author || 'Unknown'}</td>
        <td>${commit?.message || 'No message'}</td>
      `;
      tbody.appendChild(row);
    });
    recentTable.appendChild(tbody);
    recentSection.appendChild(recentTable);
    container.appendChild(recentSection);
  } else {
    // Show empty state if no commits
    const emptySection = document.createElement('div');
    emptySection.className = 'commits__section';
    emptySection.innerHTML = `
      <h2 class="commits__title">Recent Commits</h2>
      <p class="commits__empty">No commits found in this repository</p>
    `;
    container.appendChild(emptySection);
  }

  // Frequency sections
  const periods = [
    {
      name: 'This Week',
      data: frequencies.week,
      labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    {
      name: 'Today',
      data: [frequencies.week[new Date().getDay()]],
      labels: ['Today']
    },
    {
      name: 'This Year',
      data: frequencies.year,
      labels: Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return date.toLocaleString('default', { month: 'long' });
      })
    }
  ];

  periods.forEach(period => {
    const section = document.createElement('div');
    section.className = 'commits__section';
    
    const title = document.createElement('h2');
    title.className = 'commits__title';
    title.textContent = `Commits ${period.name}`;
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
 * Format date string to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/**
 * Format time duration in days to readable format
 * @param {number} days - Number of days
 * @returns {string} Formatted duration
 */
function formatDuration(days) {
  if (days === undefined || days === null) return 'N/A';
  
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (days < 30) {
    const roundedDays = Math.round(days * 10) / 10;
    return `${roundedDays} day${roundedDays !== 1 ? 's' : ''}`;
  } else {
    const months = Math.round(days / 30 * 10) / 10;
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
}

/**
 * Display repository issues and metrics
 * @param {Object} response - API response containing issue data
 */
function displayIssues(response) {
  console.log('[displayIssues] Raw response:', response);
  
  if (!response || !response.data) {
    displayMessage('No issue data available', 'error');
    return;
  }

  // Always filter by 30 days
  const data = filterIssuesByTimeRange(response.data, 30);
  
  console.log(`Displaying issues for last 30 days`);
  console.log(`Total issues in filtered data: ${data.allIssues.length}`);
  console.log(`Open: ${data.metrics.openCount}, Closed: ${data.metrics.closedCount}`);
  const app = document.querySelector('#app');
  app.innerHTML = '';

  // Create main container
  const container = document.createElement('div');
  container.className = 'issues-container';
  
  // Create dashboard header
  const header = document.createElement('div');
  header.className = 'issues-header';
  
  const title = document.createElement('h1');
  title.className = 'issues-title';
  title.textContent = 'Issues Dashboard (Last 30 Days)';
  header.appendChild(title);
  
  container.appendChild(header);
  
  // Create metrics section
  const metricsSection = document.createElement('div');
  metricsSection.className = 'issues-metrics';
  
  // Open vs Closed count
  const countCard = document.createElement('div');
  countCard.className = 'issues-card';
  
  const countChartContainer = document.createElement('div');
  countChartContainer.className = 'issues-chart-container';
  
  const countCanvas = document.createElement('canvas');
  countCanvas.className = 'issues-chart';
  countChartContainer.appendChild(countCanvas);
  
  const countTitle = document.createElement('h3');
  countTitle.className = 'issues-card__title';
  countTitle.textContent = 'Open vs Closed Issues';
  
  countCard.appendChild(countTitle);
  countCard.appendChild(countChartContainer);
  
  // Create donut chart for open vs closed
  createDonutChart(countCanvas, {
    labels: ['Open', 'Closed'],
    data: [data.metrics.openCount, data.metrics.closedCount],
    colors: ['#F44336', '#4CAF50']
  });
  
  // Time to close average
  const timeCard = document.createElement('div');
  timeCard.className = 'issues-card';
  
  const timeTitle = document.createElement('h3');
  timeTitle.className = 'issues-card__title';
  timeTitle.textContent = 'Time to Close';
  
  const timeStats = document.createElement('div');
  timeStats.className = 'issues-stats';
  timeStats.innerHTML = `
    <div class="issues-stat">
      <span class="issues-stat__label">Average</span>
      <span class="issues-stat__value">${formatDuration(data.metrics.timeToClose.average)}</span>
    </div>
    <div class="issues-stat">
      <span class="issues-stat__label">Median</span>
      <span class="issues-stat__value">${formatDuration(data.metrics.timeToClose.median)}</span>
    </div>
    <div class="issues-stat">
      <span class="issues-stat__label">Range</span>
      <span class="issues-stat__value">${formatDuration(data.metrics.timeToClose.min)} - ${formatDuration(data.metrics.timeToClose.max)}</span>
    </div>
  `;
  
  timeCard.appendChild(timeTitle);
  timeCard.appendChild(timeStats);
  
  // Add metrics cards to section
  metricsSection.appendChild(countCard);
  metricsSection.appendChild(timeCard);
  container.appendChild(metricsSection);
  
  // Create stale issues section
  const staleSection = document.createElement('div');
  staleSection.className = 'issues-section';
  
  const staleTitle = document.createElement('h2');
  staleTitle.className = 'issues-section__title';
  staleTitle.textContent = `Stale Issues (${data.metrics.staleIssues.length})`;
  staleSection.appendChild(staleTitle);
  
  if (data.metrics.staleIssues.length > 0) {
    const staleTable = document.createElement('table');
    staleTable.className = 'issues-table';
    
    const staleHeader = document.createElement('thead');
    staleHeader.innerHTML = `
      <tr>
        <th>#</th>
        <th>Title</th>
        <th>Created</th>
        <th>Last Updated</th>
        <th>Days Stale</th>
      </tr>
    `;
    staleTable.appendChild(staleHeader);
    
    const staleBody = document.createElement('tbody');
    data.metrics.staleIssues.forEach(issue => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${issue.number}</td>
        <td>${issue.title}</td>
        <td>${formatDate(issue.created_at)}</td>
        <td>${formatDate(issue.updated_at)}</td>
        <td>${issue.daysSinceUpdate}</td>
      `;
      staleBody.appendChild(row);
    });
    staleTable.appendChild(staleBody);
    staleSection.appendChild(staleTable);
  } else {
    const emptyStale = document.createElement('p');
    emptyStale.className = 'issues-empty';
    emptyStale.textContent = 'No stale issues found.';
    staleSection.appendChild(emptyStale);
  }
  
  container.appendChild(staleSection);
  
  // Create most commented issues section
  const commentedSection = document.createElement('div');
  commentedSection.className = 'issues-section';
  
  const commentedTitle = document.createElement('h2');
  commentedTitle.className = 'issues-section__title';
  commentedTitle.textContent = 'Most Commented Issues';
  commentedSection.appendChild(commentedTitle);
  
  if (data.metrics.mostCommented.length > 0) {
    // Create bar chart for most commented issues
    const chartContainer = document.createElement('div');
    chartContainer.className = 'issues-chart-container issues-chart-container--large';
    
    const commentCanvas = document.createElement('canvas');
    commentCanvas.className = 'issues-chart';
    chartContainer.appendChild(commentCanvas);
    commentedSection.appendChild(chartContainer);
    
    // Prepare data for chart - limit to top 5 for readability
    const topCommented = data.metrics.mostCommented.slice(0, 5);
    createBarChart(commentCanvas, {
      labels: topCommented.map(issue => `#${issue.number}`),
      data: topCommented.map(issue => issue.comments),
      colors: topCommented.map(() => '#2196F3')
    }, {
      label: 'Comments',
      title: 'Most Commented Issues',
      yTitle: 'Comment Count'
    });
    
    // Create table with all most commented issues
    const commentedTable = document.createElement('table');
    commentedTable.className = 'issues-table';
    
    const commentedHeader = document.createElement('thead');
    commentedHeader.innerHTML = `
      <tr>
        <th>#</th>
        <th>Title</th>
        <th>State</th>
        <th>Created</th>
        <th>Comments</th>
      </tr>
    `;
    commentedTable.appendChild(commentedHeader);
    
    const commentedBody = document.createElement('tbody');
    data.metrics.mostCommented.forEach(issue => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${issue.number}</td>
        <td>${issue.title}</td>
        <td><span class="issues-state issues-state--${issue.state}">${issue.state}</span></td>
        <td>${formatDate(issue.created_at)}</td>
        <td>${issue.comments}</td>
      `;
      commentedBody.appendChild(row);
    });
    commentedTable.appendChild(commentedBody);
    commentedSection.appendChild(commentedTable);
  } else {
    const emptyCommented = document.createElement('p');
    emptyCommented.className = 'issues-empty';
    emptyCommented.textContent = 'No issues with comments found.';
    commentedSection.appendChild(emptyCommented);
  }
  
  container.appendChild(commentedSection);
  app.appendChild(container);
}

/**
 * Filter issues by time range
 * @param {Object} data - Issues data
 * @param {number} days - Number of days to filter by
 * @returns {Object} Filtered issues data
 */
function filterIssuesByTimeRange(data, days) {
  console.log(`Filtering issues by ${days} days`);
  
  // If 'all' is selected or no days specified, return all data
  if (days === 'all' || !days) {
    console.log('Showing all issues (no time filter)');
    return data;
  }
  
  // Convert days to a number if it's a string
  const daysNum = parseInt(days, 10);
  
  // Log the actual filter being applied
  console.log(`Filtering issues by ${daysNum} days, cutoff date: ${new Date(new Date().setDate(new Date().getDate() - daysNum))}`);
  
  // Handle NaN case (could happen if parsing fails)
  if (isNaN(daysNum)) {
    console.warn('Invalid days value, showing all issues');
    return data;
  }
  
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysNum);
  
  // Filter the issues array
  const filteredIssues = data.allIssues.filter(issue => {
    const issueDate = new Date(issue.created_at);
    return issueDate >= cutoffDate;
  });
  
  // Count open and closed issues in the filtered set
  const openCount = filteredIssues.filter(issue => issue.state === 'open').length;
  const closedCount = filteredIssues.filter(issue => issue.state === 'closed').length;
  
  // Calculate time to close for filtered closed issues
  const closedIssues = filteredIssues.filter(issue => issue.state === 'closed');
  let timeToCloseValues = [];
  
  if (closedIssues.length > 0) {
    timeToCloseValues = closedIssues.map(issue => {
      const created = new Date(issue.created_at);
      const closed = new Date(issue.closed_at);
      return (closed - created) / (1000 * 60 * 60 * 24); // Convert to days
    });
  }
  
  // Calculate statistics
  const timeToClose = {
    average: timeToCloseValues.length > 0 ? 
      timeToCloseValues.reduce((sum, val) => sum + val, 0) / timeToCloseValues.length : 0,
    median: timeToCloseValues.length > 0 ? 
      timeToCloseValues.sort((a, b) => a - b)[Math.floor(timeToCloseValues.length / 2)] : 0,
    min: timeToCloseValues.length > 0 ? Math.min(...timeToCloseValues) : 0,
    max: timeToCloseValues.length > 0 ? Math.max(...timeToCloseValues) : 0
  };
  
  // Find stale issues (open issues with no updates for 30+ days)
  const staleIssues = filteredIssues.filter(issue => {
    if (issue.state !== 'open') return false;
    
    const lastUpdated = new Date(issue.updated_at);
    const now = new Date();
    const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);
    
    return daysSinceUpdate >= STALE_THRESHOLD_DAYS;
  });
  
  // Find most commented issues
  const mostCommented = [...filteredIssues]
    .sort((a, b) => b.comments - a.comments)
    .slice(0, 5);
  
  // Return the filtered data with updated metrics
  return {
    allIssues: filteredIssues,
    metrics: {
      openCount,
      closedCount,
      timeToClose,
      staleIssues,
      mostCommented
    }
  };
}

/**
 * Display repository pull requests and metrics
 * @param {Object} response - API response containing PR data
 */
function displayPullRequests(response) {
  console.log('[displayPullRequests] Raw response:', response);
  
  if (!response || !response.data) {
    displayMessage('No pull request data available', 'error');
    return;
  }

  const data = response.data;
  const app = document.querySelector('#app');
  app.innerHTML = '';

  // Create main container
  const container = document.createElement('div');
  container.className = 'issues-container';
  
  // Create dashboard header
  const header = document.createElement('div');
  header.className = 'issues-header';
  
  const title = document.createElement('h1');
  title.className = 'issues-title';
  title.textContent = 'Pull Requests Dashboard';
  header.appendChild(title);
  container.appendChild(header);
  
  // Create metrics section
  const metricsSection = document.createElement('div');
  metricsSection.className = 'issues-metrics';
  
  // PR Count Card
  const countCard = document.createElement('div');
  countCard.className = 'issues-card';
  
  const countTitle = document.createElement('h3');
  countTitle.className = 'issues-card__title';
  countTitle.textContent = 'Pull Request Status';
  
  const countChartContainer = document.createElement('div');
  countChartContainer.className = 'issues-chart-container';
  
  const countCanvas = document.createElement('canvas');
  countCanvas.className = 'issues-chart';
  countChartContainer.appendChild(countCanvas);
  
  countCard.appendChild(countTitle);
  countCard.appendChild(countChartContainer);
  
  // Create donut chart for PR status
  createDonutChart(countCanvas, {
    labels: ['Open', 'Merged'],
    data: [data.metrics.openCount, data.metrics.mergedCount],
    colors: ['#2196F3', '#9C27B0']
  });
  
  // Merge Time Card
  const timeCard = document.createElement('div');
  timeCard.className = 'issues-card';
  
  const timeTitle = document.createElement('h3');
  timeTitle.className = 'issues-card__title';
  timeTitle.textContent = 'Merge Time';
  
  const timeStats = document.createElement('div');
  timeStats.className = 'issues-stats';
  timeStats.innerHTML = `
    <div class="issues-stat">
      <span class="issues-stat__label">Average</span>
      <span class="issues-stat__value">${formatDuration(data.metrics.mergeTime.average)}</span>
    </div>
    <div class="issues-stat">
      <span class="issues-stat__label">95th Percentile</span>
      <span class="issues-stat__value">${formatDuration(data.metrics.mergeTime.percentile95)}</span>
    </div>
  `;
  
  timeCard.appendChild(timeTitle);
  timeCard.appendChild(timeStats);
  
  // Add cards to metrics section
  metricsSection.appendChild(countCard);
  metricsSection.appendChild(timeCard);
  container.appendChild(metricsSection);
  
  // Create PR Lifespan Visualization
  if (data.metrics.mergeTime.data.length > 0) {
    const lifespanSection = document.createElement('div');
    lifespanSection.className = 'issues-section';
    
    const lifespanTitle = document.createElement('h2');
    lifespanTitle.className = 'issues-section__title';
    lifespanTitle.textContent = 'PR Lifespan Visualization';
    lifespanSection.appendChild(lifespanTitle);
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'issues-chart-container issues-chart-container--large';
    
    const lifespanCanvas = document.createElement('canvas');
    lifespanCanvas.className = 'issues-chart';
    chartContainer.appendChild(lifespanCanvas);
    lifespanSection.appendChild(chartContainer);
    
    // Sort by merge time and take the top 10 for visualization
    const sortedMergeData = [...data.metrics.mergeTime.data]
      .sort((a, b) => b.mergeTime - a.mergeTime)
      .slice(0, 10);
    
    // Create bar chart for PR lifespan
    createBarChart(lifespanCanvas, {
      labels: sortedMergeData.map(pr => `#${pr.number}`),
      data: sortedMergeData.map(pr => pr.mergeTime),
      colors: sortedMergeData.map(() => '#9C27B0')
    }, {
      label: 'Days to Merge',
      title: 'PR Merge Time',
      yTitle: 'Days'
    });
    
    container.appendChild(lifespanSection);
  }
  
  // Create Active Reviewers section
  if (data.metrics.reviewers.length > 0) {
    const reviewersSection = document.createElement('div');
    reviewersSection.className = 'issues-section';
    
    const reviewersTitle = document.createElement('h2');
    reviewersTitle.className = 'issues-section__title';
    reviewersTitle.textContent = 'Active Reviewers';
    reviewersSection.appendChild(reviewersTitle);
    
    // Create chart for top reviewers
    const chartContainer = document.createElement('div');
    chartContainer.className = 'issues-chart-container issues-chart-container--large';
    
    const reviewersCanvas = document.createElement('canvas');
    reviewersCanvas.className = 'issues-chart';
    chartContainer.appendChild(reviewersCanvas);
    reviewersSection.appendChild(chartContainer);
    
    // Take top 5 reviewers for chart
    const topReviewers = data.metrics.reviewers.slice(0, 5);
    
    createBarChart(reviewersCanvas, {
      labels: topReviewers.map(r => r.name),
      data: topReviewers.map(r => r.reviewCount),
      colors: ['#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6']
    }, {
      label: 'Reviews',
      title: 'Top Reviewers',
      yTitle: 'Review Count'
    });
    
    // Create table with all reviewers
    const reviewersTable = document.createElement('table');
    reviewersTable.className = 'issues-table';
    
    const reviewersHeader = document.createElement('thead');
    reviewersHeader.innerHTML = `
      <tr>
        <th>Reviewer</th>
        <th>Reviews</th>
        <th>PRs Reviewed</th>
      </tr>
    `;
    reviewersTable.appendChild(reviewersHeader);
    
    const reviewersBody = document.createElement('tbody');
    data.metrics.reviewers.forEach(reviewer => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${reviewer.name}</td>
        <td>${reviewer.reviewCount}</td>
        <td>${reviewer.prCount}</td>
      `;
      reviewersBody.appendChild(row);
    });
    reviewersTable.appendChild(reviewersBody);
    reviewersSection.appendChild(reviewersTable);
    
    container.appendChild(reviewersSection);
  }
  
  // Add all PRs section
  const allPRsSection = document.createElement('div');
  allPRsSection.className = 'issues-section';
  
  const allPRsTitle = document.createElement('h2');
  allPRsTitle.className = 'issues-section__title';
  allPRsTitle.textContent = 'All Pull Requests';
  allPRsSection.appendChild(allPRsTitle);
  
  if (data.allPullRequests.length > 0) {
    const allPRsTable = document.createElement('table');
    allPRsTable.className = 'issues-table';
    
    const allPRsHeader = document.createElement('thead');
    allPRsHeader.innerHTML = `
      <tr>
        <th>#</th>
        <th>Title</th>
        <th>State</th>
        <th>Author</th>
        <th>Created</th>
        <th>Merged</th>
        <th>Reviews</th>
      </tr>
    `;
    allPRsTable.appendChild(allPRsHeader);
    
    const allPRsBody = document.createElement('tbody');
    data.allPullRequests.forEach(pr => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${pr.number}</td>
        <td>${pr.title}</td>
        <td><span class="issues-state issues-state--${pr.state === 'open' ? 'open' : 'closed'}">${pr.state}</span></td>
        <td>${pr.user}</td>
        <td>${formatDate(pr.created_at)}</td>
        <td>${formatDate(pr.merged_at)}</td>
        <td>${pr.reviewCount}</td>
      `;
      allPRsBody.appendChild(row);
    });
    allPRsTable.appendChild(allPRsBody);
    allPRsSection.appendChild(allPRsTable);
  } else {
    const emptyPRs = document.createElement('p');
    emptyPRs.className = 'issues-empty';
    emptyPRs.textContent = 'No pull requests found.';
    allPRsSection.appendChild(emptyPRs);
  }
  
  container.appendChild(allPRsSection);
  app.appendChild(container);
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
    const rootItem = createTreeItem(data, 0);
    // Expand root by default
    rootItem.classList.add('expanded');
    treeContainer.appendChild(rootItem);
  } else {
    const noFiles = document.createElement('div');
    noFiles.className = 'file-tree-item';
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
            // Show loading animation before fetching data
            displayMessage(`Fetching repository data for ${owner}/${repo}...`, 'loading');
            
            api.getMetadata(owner, repo)
              .then(response => displayRepoMetadata(response.data))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayWelcomeMessage();
          }
          break;
        case 'contributors':
          if (owner && repo) {
            // Show loading animation before fetching data
            displayMessage(`Fetching contributors data for ${owner}/${repo}...`, 'loading');
            
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
            // Show loading animation before fetching data
            displayMessage(`Fetching commit data for ${owner}/${repo}...`, 'loading');
            
            api.getCommits(owner, repo)
              .then(response => displayCommitFrequencies(response))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayMessage('Please select a repository first', 'error');
          }
          break;
        case 'languages':
          if (owner && repo) {
            // Show loading animation before fetching data
            displayMessage(`Fetching language data for ${owner}/${repo}...`, 'loading');
            
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
        case 'issues':
          if (owner && repo) {
            // Show loading animation before fetching data
            displayMessage(`Fetching issues data for ${owner}/${repo}...`, 'loading');
            
            api.getIssues(owner, repo)
              .then(response => displayIssues(response))
              .catch(error => displayMessage(`Error: ${error.message}`, 'error'));
          } else {
            displayMessage('Please select a repository first', 'error');
          }
          break;
        case 'pull requests':
          if (owner && repo) {
            // Show loading animation before fetching data
            displayMessage(`Fetching pull requests data for ${owner}/${repo}...`, 'loading');
            
            api.getPullRequests(owner, repo)
              .then(response => displayPullRequests(response))
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
