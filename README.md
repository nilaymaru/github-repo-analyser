# GitHub Repository Analyzer

A powerful tool for analyzing GitHub repositories, providing insights into code structure, contributor activity, and repository metrics.

![GitHub Repository Analyzer](https://via.placeholder.com/800x400?text=GitHub+Repository+Analyzer)

## Features

- **Repository Analysis**: Get detailed metrics and insights about any GitHub repository
- **Language Breakdown**: Visualize programming language distribution within repositories
- **Contributor Statistics**: Analyze contributor activity and contributions
- **Caching System**: Efficient data caching to minimize API requests
- **Responsive UI**: Clean, modern interface that works on all devices

## Tech Stack

- **Frontend**: Vanilla JavaScript with ES modules, HTML5, CSS3
- **Backend**: Node.js with Express.js
- **API Integration**: GitHub API via Octokit
- **Caching**: In-memory caching with node-cache
- **Security**: Helmet for secure HTTP headers, CORS protection
- **Containerization**: Docker and Docker Compose

## Quick Start with Docker

```bash
docker compose up --build
```

Access the application at [http://localhost:3000](http://localhost:3000)

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/test-repo` - Test GitHub API connection
- Additional endpoints for repository analysis

## Security

The application implements several security measures:
- Secure HTTP headers with Helmet
- CORS protection
- Input validation and sanitization

## License

ISC License

---

Made with ❤️ by [Your Name]