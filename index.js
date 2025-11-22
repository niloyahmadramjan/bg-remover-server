const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { removeBackground } = require("@imgly/background-removal-node");

const app = express();
app.use(cors());

// Ensure upload directory exists (important for Render)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Helper function to safely delete a file
function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("Deleted:", filePath);
    }
  } catch (err) {
    console.error("Failed to delete file:", filePath, err.message);
  }
}

// Background Removal Function
async function removeImageBackground(filePath) {
  const blob = await removeBackground(filePath);
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString("base64");
}

// Health check endpoint (useful for Render)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Background Removal API", 
    endpoint: "POST /remove-bg",
    status: "running"
  });
});

// API Route
app.post("/remove-bg", upload.single("image"), async (req, res) => {
  let inputImagePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded!" });
    }

    inputImagePath = req.file.path;
    console.log("Processing:", inputImagePath);

    // Remove BG
    const resultBase64 = await removeImageBackground(inputImagePath);

    // Delete original file after processing
    safeDelete(inputImagePath);

    // Send response (no need to save output file since we return base64)
    res.json({
      success: true,
      message: "Background removed successfully!",
      base64: `data:image/png;base64,${resultBase64}`,
    });

  } catch (error) {
    console.error(error);

    // Clean up input file on error
    if (inputImagePath) {
      safeDelete(inputImagePath);
    }

    res.status(500).json({
      success: false,
      error: error?.message || "Something went wrong",
    });
  }
});

// Use Render's PORT or fallback to 5000 for local dev
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});