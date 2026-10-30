module.exports = {
  apps: [{
    name: "kirim-mobil",
    script: "npm",
    args: "start",
    cwd: "/root/kirim-mobil",
    env: { PORT: 5000, NODE_ENV: "production" }
  }]
};
