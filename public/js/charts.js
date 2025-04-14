/**
 * Create a commit frequency chart
 * @param {HTMLCanvasElement} canvas - Canvas element to render chart on
 * @param {Object} config - Chart configuration
 * @returns {Chart} Chart instance
 */
export function createCommitChart(canvas, config) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const baseColor = config.color || 'rgb(75, 192, 192)';
    const backgroundColor = baseColor.replace('rgb', 'rgba').replace(')', ', 0.2)');

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: config.labels,
            datasets: [{
                label: 'Commits',
                data: config.data || Array(config.labels.length).fill(0),
                backgroundColor: backgroundColor,
                borderColor: baseColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (item) => {
                            const count = item.raw;
                            return `${count.toLocaleString()} commit${count !== 1 ? 's' : ''}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create a pie chart for language distribution
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart configuration
 * @param {string[]} config.labels - Language names
 * @param {number[]} config.data - Language percentages
 * @param {string[]} config.colors - Colors for each language
 */
function createLanguagePieChart(canvas, config) {
  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: config.labels,
      datasets: [{
        data: config.data,
        backgroundColor: config.colors,
        borderWidth: 1,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#333',
            font: {
              size: 12
            },
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.formattedValue;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
}

// Language colors mapping
const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#2b7489',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  'C#': '#178600',
  Go: '#00ADD8',
  PHP: '#4F5D95',
  Swift: '#ffac45',
  Kotlin: '#F18E33',
  Rust: '#dea584',
  Scala: '#c22d40',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  React: '#61dafb',
  Angular: '#dd1b16'
};

// Export functions
window.createCommitChart = createCommitChart;
window.createLanguagePieChart = createLanguagePieChart;
window.languageColors = languageColors;
