const pdfParse = require("pdf-parse");
const { analyzeArchitecture, generateImprovedArchitecture } = require("../engine/improveEngine");

async function analyzeHLDFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "No HLD file provided." });
    }

    const buffer = req.file.buffer;
    const mime = req.file.mimetype || "";
    let extractedText = "";

    if (mime === "application/pdf") {
      const data = await pdfParse(buffer);
      extractedText = data.text || "";
    } else if (mime.startsWith("image/")) {
      // For images, use the filename + user description as context
      extractedText = `User uploaded an image of their HLD architecture diagram: ${req.file.originalname}`;
    } else {
      return res.status(400).json({ status: "error", message: "Only PDF or image files are supported." });
    }

    const improvementsWanted = req.body.improvementsWanted || "";
    const currentScale = req.body.currentScale || "medium";
    const techStack = req.body.techStack || "";

    const input = {
      existingHLD: extractedText + " " + (req.body.existingHLD || ""),
      improvementsWanted,
      techStack,
      currentScale,
      features: []
    };

    const analysis = analyzeArchitecture(input);
    const improvedGraph = generateImprovedArchitecture(input, analysis);

    return res.json({
      status: "success",
      fileInfo: { name: req.file.originalname, size: `${(req.file.size / 1024).toFixed(1)} KB`, type: mime },
      analysis,
      improvedGraph
    });
  } catch (err) {
    console.error("HLD analysis error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}

module.exports = { analyzeHLDFile };
