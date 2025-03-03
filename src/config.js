// Get environment from .env file
const environment = 'PROD';

// Base URLs for different environments
const BASE_URLS = {
  DEV: 'http://localhost:8000',
  PROD: 'https://api.loes.pro:443'
};

// API endpoints configuration
const config = {
  baseUrl: BASE_URLS[environment],
  endpoints: {
    getRoom: '/api/scrumpoker/getRoom',
    vote: '/api/scrumpoker/vote',
    aiVote: '/api/scrumpoker/aiVote',
    participant: '/api/scrumpoker/participant',
    cleanVotes: '/api/scrumpoker/cleanVotes',
    updateTaskDescription: '/api/scrumpoker/updateTaskDescription',
    create: '/api/scrumpoker/create'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => `${config.baseUrl}${config.endpoints[endpoint]}`;

export default config; 