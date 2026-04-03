const app = require("./app");

const port = app.get("port");

app.listen(port, () => {
  console.log(`PulseScore backend running on port ${port}`);
});
