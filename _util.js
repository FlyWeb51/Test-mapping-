const { readPoliticalFolder } = require("../../fcc-reader");
module.exports = async (req, res) => {
  try {
    const folderUrl = String(req.query.url || "");
    const records = await readPoliticalFolder(folderUrl);
    res.json({ folderUrl, count: records.length, records });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
