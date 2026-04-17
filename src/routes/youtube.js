import express from 'express'
import youtubeService from '../services/youtubeService.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Search videos
router.get('/search', protect, async (req, res) => {
  try {
    const { q, maxResults = 20, category = 'education' } = req.query
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    const videos = await youtubeService.searchVideos(q, parseInt(maxResults), category)
    res.json({ videos, query: q, total: videos.length })
  } catch (error) {
    console.error('[YouTube] Search error:', error.message)
    res.status(500).json({ error: 'Failed to search videos' })
  }
})

// Get video details
router.get('/video/:videoId', protect, async (req, res) => {
  try {
    const { videoId } = req.params
    const videoDetails = await youtubeService.getVideoDetails(videoId)
    
    if (!videoDetails) {
      return res.status(404).json({ error: 'Video not found' })
    }
    
    res.json({ video: videoDetails })
  } catch (error) {
    console.error('[YouTube] Video details error:', error.message)
    res.status(500).json({ error: 'Failed to get video details' })
  }
})

// Get popular videos by subject
router.get('/popular/:subject', protect, async (req, res) => {
  try {
    const { subject } = req.params
    const { maxResults = 15 } = req.query
    
    const videos = await youtubeService.getPopularVideos(subject, parseInt(maxResults))
    res.json({ videos, subject, total: videos.length })
  } catch (error) {
    console.error('[YouTube] Popular videos error:', error.message)
    res.status(500).json({ error: 'Failed to get popular videos' })
  }
})

// Get curated playlists
router.get('/playlists', protect, async (req, res) => {
  try {
    const playlists = await youtubeService.getCuratedPlaylists()
    res.json({ playlists, total: playlists.length })
  } catch (error) {
    console.error('[YouTube] Playlists error:', error.message)
    res.status(500).json({ error: 'Failed to get playlists' })
  }
})

// Get playlist videos
router.get('/playlist/:playlistId', protect, async (req, res) => {
  try {
    const { playlistId } = req.params
    const { maxResults = 50 } = req.query
    
    const videos = await youtubeService.getPlaylistVideos(playlistId, parseInt(maxResults))
    res.json({ videos, playlistId, total: videos.length })
  } catch (error) {
    console.error('[YouTube] Playlist videos error:', error.message)
    res.status(500).json({ error: 'Failed to get playlist videos' })
  }
})

// Get channel information
router.get('/channel/:channelId', protect, async (req, res) => {
  try {
    const { channelId } = req.params
    const channelInfo = await youtubeService.getChannelInfo(channelId)
    
    if (!channelInfo) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json({ channel: channelInfo })
  } catch (error) {
    console.error('[YouTube] Channel info error:', error.message)
    res.status(500).json({ error: 'Failed to get channel info' })
  }
})

export default router
