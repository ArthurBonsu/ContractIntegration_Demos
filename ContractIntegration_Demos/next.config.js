const loadEnv = require("./loadEnv");

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false, // keeps the render counter in the demos honest (no double render in development)
  env: loadEnv(__dirname),
};
