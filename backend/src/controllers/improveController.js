const { analyzeArchitecture, generateImprovedArchitecture } = require("../engine/improveEngine");

function improveSystem(req, res) {
  try {
    const input = req.body;

    if (!input.description || input.description.trim().length < 20) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a more detailed description of your current architecture."
      });
    }

    const analysis = analyzeArchitecture(input);
    const improvedGraph = generateImprovedArchitecture(input, analysis);

    return res.json({
      status: "success",
      analysis,
      improvedGraph
    });

  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}

module.exports = { improveSystem };
