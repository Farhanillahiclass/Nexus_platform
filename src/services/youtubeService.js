import axios from 'axios'

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY
    this.baseUrl = 'https://www.googleapis.com/youtube/v3'
  }

  // Search for educational videos
  async searchVideos(query, maxResults = 20, category = 'education') {
    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key not configured')
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          q: query,
          part: 'snippet',
          maxResults,
          type: 'video',
          videoCategoryId: this.getCategoryId(category),
          relevanceLanguage: 'en',
          safeSearch: 'moderate',
          videoDuration: 'medium', // Medium duration (4-20 minutes) for educational content
          order: 'relevance'
        }
      })

      return this.formatSearchResults(response.data.items)
    } catch (error) {
      console.error('[YouTube] Search error:', error.message)
      return this.getFallbackVideos(query)
    }
  }

  // Get video details including statistics
  async getVideoDetails(videoId) {
    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key not configured')
      }

      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          id: videoId,
          part: 'snippet,statistics,contentDetails'
        }
      })

      return this.formatVideoDetails(response.data.items[0])
    } catch (error) {
      console.error('[YouTube] Video details error:', error.message)
      return null
    }
  }

  // Get popular educational videos by subject
  async getPopularVideos(subject = 'general', maxResults = 15) {
    const searchQueries = {
      math: 'mathematics tutorial explained',
      physics: 'physics crash course explained',
      chemistry: 'chemistry tutorial explained',
      biology: 'biology crash course explained',
      computer_science: 'computer science programming tutorial',
      history: 'history documentary explained',
      general: 'educational content learning'
    }

    const query = searchQueries[subject] || searchQueries.general
    return this.searchVideos(query, maxResults, subject)
  }

  // Get playlist videos
  async getPlaylistVideos(playlistId, maxResults = 50) {
    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key not configured')
      }

      const response = await axios.get(`${this.baseUrl}/playlistItems`, {
        params: {
          key: this.apiKey,
          playlistId,
          part: 'snippet',
          maxResults
        }
      })

      return this.formatPlaylistItems(response.data.items)
    } catch (error) {
      console.error('[YouTube] Playlist error:', error.message)
      return []
    }
  }

  // Get channel information
  async getChannelInfo(channelId) {
    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key not configured')
      }

      const response = await axios.get(`${this.baseUrl}/channels`, {
        params: {
          key: this.apiKey,
          id: channelId,
          part: 'snippet,statistics'
        }
      })

      return this.formatChannelInfo(response.data.items[0])
    } catch (error) {
      console.error('[YouTube] Channel info error:', error.message)
      return null
    }
  }

  // Helper methods
  getCategoryId(category) {
    const categories = {
      education: '27',
      science: '28',
      technology: '28'
    }
    return categories[category] || '27'
  }

  formatSearchResults(items) {
    return items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      duration: null, // Will be fetched with getVideoDetails if needed
      viewCount: null,
      likeCount: null
    }))
  }

  formatVideoDetails(item) {
    return {
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      duration: this.parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount || 0),
      likeCount: parseInt(item.statistics.likeCount || 0),
      commentCount: parseInt(item.statistics.commentCount || 0),
      tags: item.snippet.tags || []
    }
  }

  formatPlaylistItems(items) {
    return items.map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      position: item.snippet.position,
      publishedAt: item.snippet.publishedAt
    }))
  }

  formatChannelInfo(item) {
    return {
      channelId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      subscriberCount: parseInt(item.statistics.subscriberCount || 0),
      videoCount: parseInt(item.statistics.videoCount || 0),
      viewCount: parseInt(item.statistics.viewCount || 0)
    }
  }

  parseDuration(duration) {
    // Convert ISO 8601 duration to human readable format
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    const hours = parseInt(match[1]) || 0
    const minutes = parseInt(match[2]) || 0
    const seconds = parseInt(match[3]) || 0
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Fallback videos when API is not available
  getFallbackVideos(query) {
    const fallbackVideos = [
      {
        videoId: 'dQw4w9WgXcQ',
        title: `Introduction to ${query}`,
        description: `Learn the fundamentals of ${query} in this comprehensive tutorial.`,
        thumbnail: 'https://via.placeholder.com/320x180?text=Educational+Video',
        channelTitle: 'NEXUS Education',
        channelId: 'nexus_education',
        publishedAt: new Date().toISOString(),
        duration: '10:45',
        viewCount: 12500,
        likeCount: 890
      },
      {
        videoId: 'jNQXAC9IVRw',
        title: `Advanced ${query} Concepts`,
        description: `Deep dive into advanced concepts of ${query} with practical examples.`,
        thumbnail: 'https://via.placeholder.com/320x180?text=Advanced+Tutorial',
        channelTitle: 'NEXUS Academy',
        channelId: 'nexus_academy',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        duration: '15:30',
        viewCount: 8300,
        likeCount: 650
      }
    ]
    
    return fallbackVideos
  }

  // Get curated educational playlists
  async getCuratedPlaylists() {
    const playlists = [
      {
        id: 'math_fundamentals',
        title: 'Math Fundamentals',
        description: 'Complete mathematics foundation course',
        videoCount: 45,
        subject: 'math',
        thumbnail: 'https://via.placeholder.com/320x180?text=Math+Fundamentals'
      },
      {
        id: 'physics_crash_course',
        title: 'Physics Crash Course',
        description: 'Comprehensive physics introduction',
        videoCount: 32,
        subject: 'physics',
        thumbnail: 'https://via.placeholder.com/320x180?text=Physics+Course'
      },
      {
        id: 'programming_basics',
        title: 'Programming Basics',
        description: 'Learn programming from scratch',
        videoCount: 28,
        subject: 'computer_science',
        thumbnail: 'https://via.placeholder.com/320x180?text=Programming+Basics'
      },
      {
        id: 'chemistry_experiments',
        title: 'Chemistry Experiments',
        description: 'Hands-on chemistry demonstrations',
        videoCount: 24,
        subject: 'chemistry',
        thumbnail: 'https://via.placeholder.com/320x180?text=Chemistry+Labs'
      }
    ]
    
    return playlists
  }
}

export default new YouTubeService()
