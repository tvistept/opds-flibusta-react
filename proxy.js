const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// OPDS каталог
app.use("/opds", async (req, res) => {
  try {
    const target = "http://flibusta.is" + req.originalUrl;
    console.log("→ proxy catalog:", target);
    const r = await fetch(target);
    const text = await r.text();
    res.set("Content-Type", r.headers.get("content-type"));
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
});

// Скачивание книг
app.use("/b", async (req, res) => {
  try {
    const target = "http://flibusta.is" + req.originalUrl;
    console.log("→ proxy book:", target);
    const r = await fetch(target);

    res.set("Content-Type", r.headers.get("content-type"));
    res.set(
      "Content-Disposition",
      r.headers.get("content-disposition") || "attachment"
    );

    r.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
});

// React build
app.use(express.static(path.join(__dirname, "dist")));

// ⚠ Express 5 wildcard
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(4000, () =>
  console.log("Proxy running on http://localhost:4000")
);
