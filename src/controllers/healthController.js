const { checkDatabaseConnection } = require("../../database/readQueries");

exports.checkReadiness = async (req, res) => {
  try {
    await checkDatabaseConnection();
    return res.status(200).json({ status: "ready" });
  } catch (error) {
    return res.status(503).json({
      status: "not_ready",
    });
  }
};
