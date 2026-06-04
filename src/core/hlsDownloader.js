import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { getRandomUA } from '../userAgent.js';
import { formatBytes } from '../utils.js';

const UA = getRandomUA;
const REFERER = 'https://voir-anime.to/';

/**
 * Download an HLS stream (m3u8) by parsing playlists,
 * downloading all TS segments, and concatenating them into a .ts file.
 */
export async function downloadHls(m3u8Url, filePath, epNum, onProgress) {
  const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);

  // Resolve the final m3u8 (variant playlist) and get segment URLs
  const segments = await resolveSegments(m3u8Url, baseUrl);
  const total = segments.length;

  process.stdout.write(`  ep${String(epNum).padStart(2, '0')} [          ] 0% | 0/${total} segments`);

  // Download each segment and concatenate
  const writeStream = fs.createWriteStream(filePath);
  let downloaded = 0;
  const totalBytes = segments.reduce((sum, s) => sum + s.size, 0) || 0;

  for (let i = 0; i < total; i++) {
    const seg = segments[i];
    const data = await downloadWithRetry(seg.url);
    writeStream.write(data);
    downloaded += data.length;

    // Update progress line
    const pct = Math.round(((i + 1) / total) * 100);
    const barLen = 10;
    const filled = Math.round((pct / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    process.stdout.write(`\r  ep${String(epNum).padStart(2, '0')} [${bar}] ${pct}% | ${i + 1}/${total} segments | ${formatBytes(downloaded)}`);

    if (onProgress) {
      onProgress({ bytes: downloaded, total: downloaded, speed: 0, percent: (pct) });
    }
  }

  return new Promise((resolve, reject) => {
    writeStream.end(() => {
      // Check file size
      try {
        const stat = fs.statSync(filePath);
        if (stat.size === 0) {
          reject(new Error('Downloaded file is empty'));
        } else {
          resolve({ path: filePath, size: stat.size });
        }
      } catch (err) {
        reject(err);
      }
    });
    writeStream.on('error', reject);
  });
}

async function resolveSegments(m3u8Url, baseUrl) {
  const master = await fetchText(m3u8Url);

  if (!master.startsWith('#EXTM3U')) {
    throw new Error('Invalid or empty HLS playlist');
  }

  // If this is a master playlist (contains #EXT-X-STREAM-INF), find the highest quality variant
  if (master.includes('#EXT-X-STREAM-INF')) {
    const variants = parseMasterPlaylist(master, baseUrl);
    if (variants.length === 0) {
      throw new Error('No variant streams found in master playlist');
    }
    // Pick highest bandwidth variant
    variants.sort((a, b) => b.bandwidth - a.bandwidth);
    return resolveSegments(variants[0].url, variants[0].baseUrl);
  }

  // This is a segment playlist — parse TS segments
  return parseSegmentPlaylist(master, baseUrl);
}

function parseMasterPlaylist(content, baseUrl) {
  const lines = content.split('\n');
  const variants = [];
  let currentInf = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      const bwMatch = trimmed.match(/BANDWIDTH=(\d+)/);
      currentInf = { bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0 };
    } else if (currentInf && trimmed && !trimmed.startsWith('#')) {
      variants.push({
        url: resolveUrl(trimmed, baseUrl),
        baseUrl: resolveBaseUrl(trimmed, baseUrl),
        bandwidth: currentInf.bandwidth,
      });
      currentInf = null;
    }
  }

  return variants;
}

function parseSegmentPlaylist(content, baseUrl) {
  const lines = content.split('\n');
  const segments = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      segments.push({
        url: resolveUrl(trimmed, baseUrl),
        size: 0, // unknown until downloaded
      });
    }
  }

  if (segments.length === 0) {
    throw new Error('No segments found in segment playlist');
  }

  return segments;
}

function resolveUrl(urlStr, baseUrl) {
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }
  return baseUrl + urlStr;
}

function resolveBaseUrl(urlStr, baseUrl) {
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr.substring(0, urlStr.lastIndexOf('/') + 1);
  }
  return baseUrl;
}

async function fetchText(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': UA(),
      'Referer': REFERER,
    },
    timeout: 15000,
  });
  return response.data;
}

async function downloadWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': UA(),
          'Referer': REFERER,
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * Check if a URL is an HLS stream.
 */
export function isHlsUrl(url) {
  if (!url) return false;
  return url.includes('.m3u8') ||
         url.includes('vmeas.cloud') ||
         url.includes('hls');
}
