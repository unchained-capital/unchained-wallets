module.exports = {
  // enable this when we have typescript and a script for checking
  "*.ts?(x)": () => "npm run check-types",
  "*.{ts,js}": "eslint --cache --fix",
  "*.{ts,js,css,md}": "prettier --write",
};
