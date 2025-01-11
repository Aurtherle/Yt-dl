const { exec } = require("child_process");
const axios = require("axios");
const express = require("express");
const app = express();

app.use(express.json());

// Function to shorten URLs using TinyURL
async function shortenUrl(longUrl) {
  try {
    const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    return response.data;
  } catch (error) {
    console.error("Error shortening URL:", error.message);
    return longUrl; // Fallback to original URL if shortening fails
  }
}

// Convert bytes to megabytes
function bytesToMegabytes(bytes) {
  return bytes ? (bytes / (1024 * 1024)).toFixed(2) : "N/A";
}

// API endpoint to fetch video information
app.get("/api/getVideoInfo", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "No video URL provided." });
  }

  try {
    exec(`yt-dlp --dump-json "${videoUrl}"`, async (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || "Failed to process the video URL." });
      }

      try {
        const videoInfo = JSON.parse(stdout);

        // Extract download URLs and sizes
        const formats = ["144p", "240p", "360p", "480p", "720p", "1080p"];
        const links = {};

        for (const format of formats) {
          const formatInfo = videoInfo.formats.find((f) => f.format_note === format);
          if (formatInfo) {
            links[format] = {
              url: await shortenUrl(formatInfo.url),
              size_mb: bytesToMegabytes(formatInfo.filesize),
            };
          } else {
            links[format] = { url: null, size_mb: "N/A" };
          }
        }

        const musicInfo = videoInfo.formats.find((f) => f.format_note === "audio");
        links["music"] = {
          url: musicInfo ? await shortenUrl(musicInfo.url) : null,
          size_mb: bytesToMegabytes(musicInfo?.filesize),
        };

        // Construct response
        const response = {
          creator: "AURTHER~آرثر",
          status: true,
          process: Math.random().toFixed(4),
          data: {
            id: videoInfo.id,
            region: videoInfo.availability || "N/A",
            title: videoInfo.title,
            duration: videoInfo.duration,
            repro: videoInfo.view_count,
            like: videoInfo.like_count,
            share: videoInfo.comment_count,
            comment: videoInfo.comment_count,
            download: videoInfo.download_count || 0,
            published: new Date(videoInfo.upload_date).getTime() / 1000 || "N/A",
            author: {
              id: videoInfo.uploader_id || "N/A",
              username: videoInfo.uploader_url || "N/A",
              nickname: videoInfo.uploader || "N/A",
            },
            music: {
              title: videoInfo.track || "N/A",
              author: videoInfo.artist || "N/A",
              duration: videoInfo.duration || "N/A",
            },
            media: {
              type: "video",
              links,
            },
          },
        };

        res.setHeader("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(response, null, 2));
      } catch (parseError) {
        res.status(500).json({ error: "Failed to parse video information." });
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error." });
  }
});

// Root endpoint for health check
app.get("/", (req, res) => {
  res.send("آرثر هنا كل شيء يعمل بخير!");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});