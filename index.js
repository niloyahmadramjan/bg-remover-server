const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { removeBackground } = require("@imgly/background-removal-node");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000; // use Render assigned port

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Background Removal Function
async function removeImageBackground(filePath) {
  const blob = await removeBackground(filePath);
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString("base64"); // Return base64
}

// API Route
app.post("/remove-bg", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded!" });
    }

    const inputImagePath = req.file.path;

    console.log("Processing:", inputImagePath);

    // Remove BG
    const resultBase64 = await removeImageBackground(inputImagePath);

    // OPTIONAL: Save output file
    const outputImagePath = `outputs/output-${Date.now()}.png`;
    fs.writeFileSync(outputImagePath, resultBase64, "base64");

    // Delete original file after processing
    fs.unlinkSync(inputImagePath);

    // Send response
    res.json({
      success: true,
      message: "Background removed successfully!",
      base64: `data:image/png;base64,${resultBase64}`,
      outputPath: outputImagePath,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error?.message || "Something went wrong",
    });
  }
});

// Start Server

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});